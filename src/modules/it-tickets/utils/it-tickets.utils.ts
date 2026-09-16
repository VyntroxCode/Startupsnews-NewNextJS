import {
  ItTicketEntity, ItTicket,
  ItTicketCommentEntity, ItTicketComment,
  ItTicketAttachmentEntity, ItTicketAttachment,
} from '../domain/types';

export function entityToTicket(e: ItTicketEntity): ItTicket {
  return {
    id: e.id,
    ticketKey: e.ticket_key,
    title: e.title,
    description: e.description,
    status: e.status,
    priority: e.priority,
    type: e.type,
    reporterId: e.reporter_id,
    reporterRole: e.reporter_role,
    reporterName: e.reporter_name,
    assigneeId: e.assignee_id,
    assigneeRole: e.assignee_role,
    assigneeName: e.assignee_name,
    dueDate: e.due_date,
    resolvedAt: e.resolved_at,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    // COUNT() arrives as bigint from the mariadb driver — Number() before it hits JSON.stringify.
    commentCount: Number(e.comment_count ?? 0),
    attachmentCount: Number(e.attachment_count ?? 0),
  };
}

export function entityToComment(e: ItTicketCommentEntity): ItTicketComment {
  return {
    id: e.id,
    ticketId: e.ticket_id,
    authorId: e.author_id,
    authorRole: e.author_role,
    authorName: e.author_name,
    body: e.body,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

export function entityToAttachment(e: ItTicketAttachmentEntity): ItTicketAttachment {
  return {
    id: e.id,
    ticketId: e.ticket_id,
    uploadedById: e.uploaded_by_id,
    uploadedByRole: e.uploaded_by_role,
    uploadedByName: e.uploaded_by_name,
    fileName: e.file_name,
    fileUrl: e.file_url,
    fileSize: e.file_size,
    mimeType: e.mime_type,
    createdAt: e.created_at,
  };
}
