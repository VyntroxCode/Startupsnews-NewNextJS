import { query, queryOne } from '@/shared/database/connection';
import { SalesLead, SalesLeadEntity } from '../domain/types';

type SqlParam = string | number | null;

export class SalesTrackerRepository {
  async findAllLeads(): Promise<SalesLeadEntity[]> {
    return query<SalesLeadEntity>('SELECT * FROM sales_leads ORDER BY lead_date DESC, created_at DESC');
  }

  async findLeadById(id: string): Promise<SalesLeadEntity | null> {
    return queryOne<SalesLeadEntity>('SELECT * FROM sales_leads WHERE id = ?', [id]);
  }

  async upsertLead(lead: SalesLead): Promise<SalesLeadEntity> {
    const params: SqlParam[] = [
      lead.id,
      lead.date || null,
      lead.name,
      lead.company || null,
      lead.contact || null,
      lead.email || null,
      lead.country || null,
      lead.city || null,
      lead.source || null,
      lead.type || null,
      lead.otherType || null,
      lead.query || null,
      lead.eventTitle || null,
      lead.eventSlug || null,
      lead.eventDate || null,
      lead.eventTime || null,
      lead.externalUrl || null,
      lead.posterUrl || null,
      lead.description || null,
      lead.assignedTo || null,
      lead.status || null,
      lead.nextFollowUpDate || null,
      lead.lastConnectDate || null,
      lead.lastCallDiscussion || null,
    ];
    await query(
      `INSERT INTO sales_leads
        (id, lead_date, name, company, contact, email, country, city, source, type, other_type, query_text, event_title, event_slug, event_date, event_time, external_url, poster_url, description, assigned_to, status, next_follow_up_date, last_connect_date, last_call_discussion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        lead_date = VALUES(lead_date), name = VALUES(name), company = VALUES(company), contact = VALUES(contact),
        email = VALUES(email), country = VALUES(country), city = VALUES(city), source = VALUES(source),
        type = VALUES(type), other_type = VALUES(other_type),
        query_text = VALUES(query_text), event_title = VALUES(event_title), event_slug = VALUES(event_slug),
        event_date = VALUES(event_date), event_time = VALUES(event_time), external_url = VALUES(external_url),
        poster_url = VALUES(poster_url), description = VALUES(description),
        assigned_to = VALUES(assigned_to), status = VALUES(status),
        next_follow_up_date = VALUES(next_follow_up_date), last_connect_date = VALUES(last_connect_date),
        last_call_discussion = VALUES(last_call_discussion)`,
      params
    );
    const saved = await this.findLeadById(lead.id);
    if (!saved) throw new Error('Lead saved but could not be reloaded');
    return saved;
  }

  async deleteLead(id: string): Promise<void> {
    await query('DELETE FROM sales_leads WHERE id = ?', [id]);
  }

  async deleteAllLeads(): Promise<void> {
    await query('DELETE FROM sales_leads', []);
  }

  async findAllTeamMembers(): Promise<{ id: number; name: string }[]> {
    return query<{ id: number; name: string }>('SELECT id, name FROM sales_team_members ORDER BY sort_order ASC, id ASC');
  }

  async addTeamMember(name: string): Promise<void> {
    const row = await queryOne<{ maxOrder: number | null }>('SELECT MAX(sort_order) as maxOrder FROM sales_team_members');
    const nextOrder = (row?.maxOrder ?? -1) + 1;
    await query('INSERT IGNORE INTO sales_team_members (name, sort_order) VALUES (?, ?)', [name, nextOrder]);
  }

  async removeTeamMember(name: string): Promise<void> {
    await query('DELETE FROM sales_team_members WHERE name = ?', [name]);
  }
}
