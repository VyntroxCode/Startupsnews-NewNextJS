export interface SalesLead {
  id: string;
  date: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  source: string;
  type: string;
  otherType: string;
  query: string;
  assignedTo: string;
  status: string;
  nextFollowUpDate: string;
  lastConnectDate: string;
  lastCallDiscussion: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesLeadEntity {
  id: string;
  lead_date: string | null;
  name: string;
  company: string | null;
  contact: string | null;
  email: string | null;
  source: string | null;
  type: string | null;
  other_type: string | null;
  query_text: string | null;
  assigned_to: string | null;
  status: string | null;
  next_follow_up_date: string | null;
  last_connect_date: string | null;
  last_call_discussion: string | null;
  created_at: string;
  updated_at: string;
}

export type SalesLeadInput = Omit<SalesLead, 'createdAt' | 'updatedAt'>;
