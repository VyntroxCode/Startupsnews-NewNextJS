import { ItTicketsRepository } from '../repository/it-tickets.repository';
import { entityToTicket, entityToComment, entityToAttachment } from '../utils/it-tickets.utils';
import { IT_TICKETS_MANAGE_ROLES } from '@/shared/middleware/roles';
import { canSetTicketStatus, statusDenialMessage } from '../domain/status-policy';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import {
  ItTicket, ItTicketFilters, CreateTicketDto, UpdateTicketDto, TicketActor,
  ItTicketComment, ItTicketAttachment, ItTicketExport,
  IT_TICKET_STATUSES, IT_TICKET_PRIORITIES, IT_TICKET_TYPES,
  IT_TICKET_TITLE_MAX, IT_TICKET_BODY_MAX,
} from '../domain/types';

export class TicketNotFoundError extends Error {
  constructor(id: string) {
    super(`Ticket ${id} not found`);
    this.name = 'TicketNotFoundError';
  }
}

export class TicketForbiddenError extends Error {
  constructor(message = 'You do not have access to this ticket') {
    super(message);
    this.name = 'TicketForbiddenError';
  }
}

/** A caller-supplied value that fails validation → HTTP 400. Anything else thrown is a real
 * server fault and the routes report it as 500 rather than blaming the client. */
export class TicketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketValidationError';
  }
}

function isManager(actor: TicketActor): boolean {
  return (IT_TICKETS_MANAGE_ROLES as readonly string[]).includes(actor.role);
}

/** `users.id` and `panel_admins.id` overlap, so a person is only ever the (id, role) pair. */
function isSameActor(id: number, role: string, actor: TicketActor): boolean {
  return id === actor.id && role === actor.role;
}

function assertValid<T extends string>(value: T | undefined, allowed: T[], label: string): void {
  if (value !== undefined && !allowed.includes(value)) {
    throw new TicketValidationError(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

function assertDueDate(value: string | null | undefined): void {
  if (value === undefined || value === null || value === '') return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new TicketValidationError('Due date must be a valid date (YYYY-MM-DD)');
  }
}

function assertTitle(title: string | undefined, required: boolean): string | undefined {
  if (title === undefined) {
    if (required) throw new TicketValidationError('Summary is required');
    return undefined;
  }
  const trimmed = title.trim();
  if (!trimmed) throw new TicketValidationError('Summary is required');
  if (trimmed.length > IT_TICKET_TITLE_MAX) {
    throw new TicketValidationError(`Summary must be ${IT_TICKET_TITLE_MAX} characters or fewer`);
  }
  return trimmed;
}

function assertBody(body: string | undefined, label: string): void {
  if (body !== undefined && body !== null && body.length > IT_TICKET_BODY_MAX) {
    throw new TicketValidationError(`${label} must be ${IT_TICKET_BODY_MAX} characters or fewer`);
  }
}

type AssigneeFields = Pick<UpdateTicketDto, 'assigneeId' | 'assigneeRole' | 'assigneeName'>;

export class ItTicketsService {
  constructor(
    private repository: ItTicketsRepository,
    private usersRepository: UsersRepository = new UsersRepository(),
    private panelAdminsRepository: PanelAdminsRepository = new PanelAdminsRepository()
  ) {}

  /** Non-managers only ever see their own tickets — the queue itself is manager-only. Managers can
   * opt into the same scoping with `mine` ("Only my tickets"). */
  async listTickets(actor: TicketActor, filters: ItTicketFilters = {}): Promise<ItTicket[]> {
    const { mine, ...rest } = filters;
    const scoped: ItTicketFilters = (isManager(actor) && !mine)
      ? rest
      : { ...rest, reporterId: actor.id, reporterRole: actor.role };
    const entities = await this.repository.findAll(scoped);
    return entities.map(entityToTicket);
  }

  /** Accepts either the opaque id (`tkt_…`) or the human key (`IT-12`, used by deep links). */
  async getTicket(actor: TicketActor, idOrKey: string): Promise<ItTicket> {
    const entity = /^IT-\d+$/i.test(idOrKey)
      ? await this.repository.findByKey(idOrKey.toUpperCase())
      : await this.repository.findById(idOrKey);
    if (!entity) throw new TicketNotFoundError(idOrKey);
    if (!isManager(actor) && !isSameActor(entity.reporter_id, entity.reporter_role, actor)) {
      throw new TicketForbiddenError();
    }
    return entityToTicket(entity);
  }

  /** The client only ever sends (assigneeId, assigneeRole); the display name is looked up here so a
   * caller cannot write an arbitrary string into `assignee_name`, and unknown/inactive people are
   * rejected. `assigneeId: null` clears the assignment. */
  private async resolveAssignee(data: AssigneeFields): Promise<AssigneeFields> {
    if (data.assigneeId === undefined && data.assigneeRole === undefined) return {};
    if (data.assigneeId === null || data.assigneeId === undefined) {
      return { assigneeId: null, assigneeRole: null, assigneeName: null };
    }
    const id = Number(data.assigneeId);
    const role = data.assigneeRole;
    if (!Number.isInteger(id) || !role) throw new TicketValidationError('Assignee must include both id and role');

    if (role === 'admin') {
      const user = await this.usersRepository.findById(id);
      if (!user || user.role !== 'admin' || !user.is_active) throw new TicketValidationError('Assignee not found');
      return { assigneeId: user.id, assigneeRole: 'admin', assigneeName: user.name };
    }
    if (role === 'it_support') {
      const admin = await this.panelAdminsRepository.findById(id);
      if (!admin || admin.role !== 'it_support' || !admin.is_active) throw new TicketValidationError('Assignee not found');
      return { assigneeId: admin.id, assigneeRole: 'it_support', assigneeName: admin.name };
    }
    throw new TicketValidationError('Tickets can only be assigned to Admins or IT Support');
  }

  async createTicket(actor: TicketActor, data: CreateTicketDto): Promise<ItTicket> {
    const title = assertTitle(data.title, true) as string;
    assertBody(data.description, 'Description');
    assertValid(data.priority, IT_TICKET_PRIORITIES, 'Priority');
    assertValid(data.type, IT_TICKET_TYPES, 'Type');
    assertValid(data.status, IT_TICKET_STATUSES, 'Status');
    assertDueDate(data.dueDate);

    const manager = isManager(actor);
    // A manager creating straight into a column is still bound by the status policy — otherwise
    // "+ Create" in the Blocked column would be a way around the admin-only Blocked rule.
    if (manager && data.status && !canSetTicketStatus(actor.role, null, data.status)) {
      throw new TicketForbiddenError(statusDenialMessage(actor.role, null, data.status));
    }
    // Only managers may pre-assign a ticket or create it directly in a non-open column.
    const assignee = manager ? await this.resolveAssignee(data) : { assigneeId: null, assigneeRole: null, assigneeName: null };
    const dto: CreateTicketDto = {
      ...data,
      ...assignee,
      title,
      status: manager ? data.status : undefined,
      dueDate: data.dueDate || null,
    };
    const entity = await this.repository.create(dto, actor);
    return entityToTicket(entity);
  }

  async updateTicket(actor: TicketActor, id: string, data: UpdateTicketDto): Promise<ItTicket> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new TicketNotFoundError(id);

    const manager = isManager(actor);
    const isReporter = isSameActor(entity.reporter_id, entity.reporter_role, actor);
    if (!manager && !isReporter) throw new TicketForbiddenError();

    assertValid(data.status, IT_TICKET_STATUSES, 'Status');
    assertValid(data.priority, IT_TICKET_PRIORITIES, 'Priority');
    assertValid(data.type, IT_TICKET_TYPES, 'Type');
    assertDueDate(data.dueDate);
    assertBody(data.description, 'Description');
    const title = assertTitle(data.title, false);

    let allowed: UpdateTicketDto;
    if (manager) {
      // Status changes go through the shared policy (only Admin moves tickets into/out of Blocked).
      // Other edits on a blocked ticket (priority, assignee, due date…) stay open to IT Support.
      if (data.status !== undefined && data.status !== entity.status
        && !canSetTicketStatus(actor.role, entity.status, data.status)) {
        throw new TicketForbiddenError(statusDenialMessage(actor.role, entity.status, data.status));
      }
      allowed = { ...data, ...(await this.resolveAssignee(data)) };
      if (data.dueDate === '') allowed.dueDate = null;
    } else {
      // Reporters may only edit their own ticket's title/description, and only before triage starts.
      if (entity.status !== 'open') {
        throw new TicketForbiddenError('This ticket is already being worked on — only IT Support can change it now.');
      }
      allowed = { title: data.title, description: data.description };
    }
    if (title !== undefined) allowed.title = title;

    const updated = await this.repository.update(id, allowed);
    return entityToTicket(updated);
  }

  async deleteTicket(id: string): Promise<void> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new TicketNotFoundError(id);
    await this.repository.delete(id);
  }

  /** Excel export: the same filtered list the board shows, plus every comment and attachment on those
   * tickets, in one round trip. Managers only — reporters/employees never export. */
  async exportTickets(actor: TicketActor, filters: ItTicketFilters = {}): Promise<ItTicketExport> {
    if (!isManager(actor)) throw new TicketForbiddenError('Only Admin or IT Support can export tickets');
    const tickets = await this.listTickets(actor, filters);
    const ids = tickets.map((t) => t.id);
    const [comments, attachments] = ids.length
      ? await Promise.all([
        this.repository.findCommentsForTickets(ids),
        this.repository.findAttachmentsForTickets(ids),
      ])
      : [[], []];
    return {
      tickets,
      comments: comments.map(entityToComment),
      attachments: attachments.map(entityToAttachment),
      generatedAt: new Date().toISOString(),
    };
  }

  // ---- Comments ----

  async listComments(actor: TicketActor, ticketId: string): Promise<ItTicketComment[]> {
    await this.getTicket(actor, ticketId); // enforces view access, 404s if missing
    const entities = await this.repository.findComments(ticketId);
    return entities.map(entityToComment);
  }

  async addComment(actor: TicketActor, ticketId: string, body: string): Promise<ItTicketComment> {
    if (!body || !body.trim()) throw new TicketValidationError('Comment cannot be empty');
    assertBody(body, 'Comment');
    await this.getTicket(actor, ticketId); // enforces view access, 404s if missing
    const entity = await this.repository.createComment(ticketId, body.trim(), actor);
    return entityToComment(entity);
  }

  async deleteComment(actor: TicketActor, ticketId: string, commentId: string): Promise<void> {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.ticket_id !== ticketId) throw new TicketNotFoundError(commentId);
    if (!isManager(actor) && !isSameActor(comment.author_id, comment.author_role, actor)) {
      throw new TicketForbiddenError('You can only delete your own comments');
    }
    await this.repository.deleteComment(commentId);
  }

  // ---- Attachments ----

  async listAttachments(actor: TicketActor, ticketId: string): Promise<ItTicketAttachment[]> {
    await this.getTicket(actor, ticketId);
    const entities = await this.repository.findAttachments(ticketId);
    return entities.map(entityToAttachment);
  }

  async addAttachment(
    actor: TicketActor,
    ticketId: string,
    data: { fileName: string; fileUrl: string; fileSize?: number | null; mimeType?: string | null }
  ): Promise<ItTicketAttachment> {
    if (!data.fileName || !data.fileUrl) throw new TicketValidationError('fileName and fileUrl are required');
    if (data.fileName.length > 500) throw new TicketValidationError('File name is too long');
    await this.getTicket(actor, ticketId);
    const entity = await this.repository.createAttachment(ticketId, data, actor);
    return entityToAttachment(entity);
  }

  async deleteAttachment(actor: TicketActor, ticketId: string, attachmentId: string): Promise<void> {
    const attachment = await this.repository.findAttachmentById(attachmentId);
    if (!attachment || attachment.ticket_id !== ticketId) throw new TicketNotFoundError(attachmentId);
    if (!isManager(actor) && !isSameActor(attachment.uploaded_by_id, attachment.uploaded_by_role, actor)) {
      throw new TicketForbiddenError('You can only delete your own attachments');
    }
    await this.repository.deleteAttachment(attachmentId);
  }
}
