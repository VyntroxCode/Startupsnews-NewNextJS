import { randomUUID } from 'crypto';
import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import {
  ItTicketEntity, ItTicketFilters, CreateTicketDto, UpdateTicketDto, TicketActor,
  ItTicketCommentEntity, ItTicketAttachmentEntity,
} from '../domain/types';

/** Every ticket read goes through this SELECT so list rows AND the row returned after a write both
 * carry the comment/attachment counts the board cards render as badges. */
const TICKET_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM it_ticket_comments c WHERE c.ticket_id = t.id) AS comment_count,
    (SELECT COUNT(*) FROM it_ticket_attachments a WHERE a.ticket_id = t.id) AS attachment_count
  FROM it_tickets t`;

/** `%` and `_` are LIKE wildcards; a user searching for "100%" should match the literal text. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Splits an id list so `IN (…)` never gets an unbounded number of placeholders. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const IN_CHUNK_SIZE = 500;

export class ItTicketsRepository {
  async findAll(filters?: ItTicketFilters): Promise<ItTicketEntity[]> {
    let sql = `${TICKET_SELECT} WHERE 1=1`;
    const params: (string | number)[] = [];

    if (filters?.status) {
      sql += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters?.priority) {
      sql += ' AND t.priority = ?';
      params.push(filters.priority);
    }
    if (filters?.type) {
      sql += ' AND t.type = ?';
      params.push(filters.type);
    }
    // Identity is always the (id, role) pair — ids overlap between `users` and `panel_admins`.
    if (filters?.assigneeId && filters.assigneeRole) {
      sql += ' AND t.assignee_id = ? AND t.assignee_role = ?';
      params.push(filters.assigneeId, filters.assigneeRole);
    }
    if (filters?.reporterId && filters.reporterRole) {
      sql += ' AND t.reporter_id = ? AND t.reporter_role = ?';
      params.push(filters.reporterId, filters.reporterRole);
    }
    if (filters?.search) {
      sql += " AND (t.title LIKE ? ESCAPE '\\\\' OR t.ticket_key LIKE ? ESCAPE '\\\\' OR t.description LIKE ? ESCAPE '\\\\')";
      const like = `%${escapeLike(filters.search)}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY t.created_at DESC';
    return query<ItTicketEntity>(sql, params);
  }

  async findById(id: string): Promise<ItTicketEntity | null> {
    return queryOne<ItTicketEntity>(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
  }

  /** Deep links use the human key (`?ticket=IT-12`), not the opaque uuid id. */
  async findByKey(ticketKey: string): Promise<ItTicketEntity | null> {
    return queryOne<ItTicketEntity>(`${TICKET_SELECT} WHERE t.ticket_key = ?`, [ticketKey]);
  }

  /** Count of tickets still awaiting resolution — used by the dashboard's IT Tickets stat card. */
  async countOpen(): Promise<number> {
    const result = await queryOne<{ count: number | bigint }>(
      "SELECT COUNT(*) as count FROM it_tickets WHERE status NOT IN ('resolved', 'closed')"
    );
    return result?.count ? Number(result.count) : 0;
  }

  /** Atomically claims the next sequence number for a Jira-style key ('IT-1', 'IT-2', ...). */
  private async nextTicketKey(): Promise<string> {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = (await connection.query('INSERT INTO it_ticket_key_seq () VALUES ()')) as { insertId?: number | bigint };
      if (!result.insertId) throw new Error('Failed to allocate a ticket key');
      return `IT-${result.insertId}`;
    } finally {
      connection.release();
    }
  }

  async create(data: CreateTicketDto, reporter: TicketActor): Promise<ItTicketEntity> {
    const id = `tkt_${randomUUID()}`;
    const ticketKey = await this.nextTicketKey();
    const status = data.status ?? 'open';
    const resolvedNow = status === 'resolved' || status === 'closed';

    await query(
      `INSERT INTO it_tickets
        (id, ticket_key, title, description, status, priority, type, reporter_id, reporter_role, reporter_name,
         assignee_id, assignee_role, assignee_name, due_date, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${resolvedNow ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [
        id,
        ticketKey,
        data.title,
        data.description ?? null,
        status,
        data.priority ?? 'medium',
        data.type ?? 'other',
        reporter.id,
        reporter.role,
        reporter.name,
        data.assigneeId ?? null,
        data.assigneeRole ?? null,
        data.assigneeName ?? null,
        data.dueDate ?? null,
      ]
    );

    return this.findById(id) as Promise<ItTicketEntity>;
  }

  async update(id: string, data: UpdateTicketDto): Promise<ItTicketEntity> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    const columnMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      type: 'type',
      dueDate: 'due_date',
      assigneeId: 'assignee_id',
      assigneeRole: 'assignee_role',
      assigneeName: 'assignee_name',
    };

    Object.entries(data).forEach(([key, value]) => {
      const column = columnMap[key];
      if (column && value !== undefined) {
        fields.push(`${column} = ?`);
        params.push(value as string | number | null);
      }
    });

    if (data.status === 'resolved' || data.status === 'closed') {
      fields.push('resolved_at = CURRENT_TIMESTAMP');
    } else if (data.status) {
      fields.push('resolved_at = NULL');
    }

    if (fields.length === 0) return this.findById(id) as Promise<ItTicketEntity>;

    params.push(id);
    await query(`UPDATE it_tickets SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<ItTicketEntity>;
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM it_tickets WHERE id = ?', [id]);
  }

  // ---- Comments ----

  async findComments(ticketId: string): Promise<ItTicketCommentEntity[]> {
    return query<ItTicketCommentEntity>(
      'SELECT * FROM it_ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );
  }

  async findCommentById(id: string): Promise<ItTicketCommentEntity | null> {
    return queryOne<ItTicketCommentEntity>('SELECT * FROM it_ticket_comments WHERE id = ?', [id]);
  }

  async createComment(ticketId: string, body: string, author: TicketActor): Promise<ItTicketCommentEntity> {
    const id = `cmt_${randomUUID()}`;
    await query(
      `INSERT INTO it_ticket_comments (id, ticket_id, author_id, author_role, author_name, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ticketId, author.id, author.role, author.name, body]
    );
    return this.findCommentById(id) as Promise<ItTicketCommentEntity>;
  }

  /** All comments on a set of tickets (Excel export), oldest first within each ticket. */
  async findCommentsForTickets(ticketIds: string[]): Promise<ItTicketCommentEntity[]> {
    const rows: ItTicketCommentEntity[] = [];
    for (const ids of chunk(ticketIds, IN_CHUNK_SIZE)) {
      const placeholders = ids.map(() => '?').join(', ');
      rows.push(...await query<ItTicketCommentEntity>(
        `SELECT * FROM it_ticket_comments WHERE ticket_id IN (${placeholders}) ORDER BY ticket_id, created_at ASC`,
        ids
      ));
    }
    return rows;
  }

  async deleteComment(id: string): Promise<void> {
    await query('DELETE FROM it_ticket_comments WHERE id = ?', [id]);
  }

  // ---- Attachments ----

  async findAttachments(ticketId: string): Promise<ItTicketAttachmentEntity[]> {
    return query<ItTicketAttachmentEntity>(
      'SELECT * FROM it_ticket_attachments WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );
  }

  async findAttachmentById(id: string): Promise<ItTicketAttachmentEntity | null> {
    return queryOne<ItTicketAttachmentEntity>('SELECT * FROM it_ticket_attachments WHERE id = ?', [id]);
  }

  async createAttachment(
    ticketId: string,
    data: { fileName: string; fileUrl: string; fileSize?: number | null; mimeType?: string | null },
    uploader: TicketActor
  ): Promise<ItTicketAttachmentEntity> {
    const id = `att_${randomUUID()}`;
    await query(
      `INSERT INTO it_ticket_attachments
        (id, ticket_id, uploaded_by_id, uploaded_by_role, uploaded_by_name, file_name, file_url, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ticketId, uploader.id, uploader.role, uploader.name, data.fileName, data.fileUrl, data.fileSize ?? null, data.mimeType ?? null]
    );
    return this.findAttachmentById(id) as Promise<ItTicketAttachmentEntity>;
  }

  /** All attachments on a set of tickets (Excel export), oldest first within each ticket. */
  async findAttachmentsForTickets(ticketIds: string[]): Promise<ItTicketAttachmentEntity[]> {
    const rows: ItTicketAttachmentEntity[] = [];
    for (const ids of chunk(ticketIds, IN_CHUNK_SIZE)) {
      const placeholders = ids.map(() => '?').join(', ');
      rows.push(...await query<ItTicketAttachmentEntity>(
        `SELECT * FROM it_ticket_attachments WHERE ticket_id IN (${placeholders}) ORDER BY ticket_id, created_at ASC`,
        ids
      ));
    }
    return rows;
  }

  async deleteAttachment(id: string): Promise<void> {
    await query('DELETE FROM it_ticket_attachments WHERE id = ?', [id]);
  }
}
