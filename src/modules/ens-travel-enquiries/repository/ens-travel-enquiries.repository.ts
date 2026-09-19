import { query, queryOne } from '@/shared/database/connection';
import type { EnsTravelEnquiryAdminInput, EnsTravelEnquiryEntity, EnsTravelEnquiryInput } from '../domain/types';

/** Table: ens_travel_enquiries (scripts/migrations/add-ens-travel-enquiries-table.sql, plus the
 * lead_status / conversation_note columns from add-ens-lead-status.sql and the referred_by /
 * found_us / found_us_detail columns from add-ens-referral-source.sql). */
export class EnsTravelEnquiriesRepository {
  async findAll(): Promise<EnsTravelEnquiryEntity[]> {
    return query<EnsTravelEnquiryEntity>('SELECT * FROM ens_travel_enquiries ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<EnsTravelEnquiryEntity | null> {
    return queryOne<EnsTravelEnquiryEntity>('SELECT * FROM ens_travel_enquiries WHERE id = ?', [id]);
  }

  async insert(id: string, input: EnsTravelEnquiryInput): Promise<void> {
    await query(
      `INSERT INTO ens_travel_enquiries
         (id, name, email, contact, city, country, participation, requirement, referred_by, found_us, found_us_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.name, input.email, input.contact, input.city, input.country, input.participation,
        input.requirement || null, input.referredBy || null, input.foundUs, input.foundUsDetail || null,
      ]
    );
  }

  /** An admin edit. `updated_at` is set here explicitly rather than by an ON UPDATE clause, so it
   * only ever records an admin change — never, say, a future maintenance script touching the row.
   * The conversation record is written as-is: the service has already blanked the note for any
   * status other than "followed-up", and nulls a cleared status. */
  async update(id: string, input: EnsTravelEnquiryAdminInput, updatedBy: string): Promise<void> {
    await query(
      `UPDATE ens_travel_enquiries
          SET name = ?, email = ?, contact = ?, city = ?, country = ?, participation = ?, requirement = ?,
              referred_by = ?, found_us = ?, found_us_detail = ?,
              lead_status = ?, conversation_note = ?,
              updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE id = ?`,
      [
        input.name,
        input.email,
        input.contact,
        input.city,
        input.country,
        input.participation,
        input.requirement || null,
        input.referredBy || null,
        input.foundUs,
        input.foundUsDetail || null,
        input.leadStatus,
        input.conversationNote || null,
        updatedBy || null,
        id,
      ]
    );
  }
}
