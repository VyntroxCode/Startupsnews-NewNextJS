import { SalesLead, SalesLeadEntity } from '../domain/types';

export function entityToLead(e: SalesLeadEntity): SalesLead {
  return {
    id: e.id,
    date: e.lead_date || '',
    name: e.name || '',
    company: e.company || '',
    contact: e.contact || '',
    email: e.email || '',
    source: e.source || '',
    type: e.type || '',
    otherType: e.other_type || '',
    query: e.query_text || '',
    assignedTo: e.assigned_to || '',
    status: e.status || '',
    nextFollowUpDate: e.next_follow_up_date || '',
    lastConnectDate: e.last_connect_date || '',
    lastCallDiscussion: e.last_call_discussion || '',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}
