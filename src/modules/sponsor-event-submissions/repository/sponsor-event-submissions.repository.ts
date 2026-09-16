import { query, queryOne } from '@/shared/database/connection';
import { SponsorEventSubmissionEntity, SponsorEventSubmissionInput } from '../domain/types';

export class SponsorEventSubmissionsRepository {
  async findAll(): Promise<SponsorEventSubmissionEntity[]> {
    return query<SponsorEventSubmissionEntity>('SELECT * FROM sponsor_event_submissions ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<SponsorEventSubmissionEntity | null> {
    return queryOne<SponsorEventSubmissionEntity>('SELECT * FROM sponsor_event_submissions WHERE id = ?', [id]);
  }

  async insert(id: string, input: SponsorEventSubmissionInput): Promise<void> {
    await query(
      `INSERT INTO sponsor_event_submissions
         (id, event_title, event_slug, location, country, city, external_url, event_date, event_time,
          description, poster_url, contact_name, contact_email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.eventTitle,
        input.eventSlug,
        input.location,
        input.country || null,
        input.city || null,
        input.externalUrl || null,
        input.eventDate,
        input.eventTime,
        input.description,
        input.posterUrl,
        input.contactName,
        input.contactEmail,
        input.phone || null,
      ]
    );
  }
}
