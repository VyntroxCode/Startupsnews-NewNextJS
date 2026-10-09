import { query, queryOne } from '@/shared/database/connection';
import { AdvertiseSubmissionEntity, AdvertiseSubmissionInput } from '../domain/types';

export class AdvertiseSubmissionsRepository {
  async findAll(): Promise<AdvertiseSubmissionEntity[]> {
    return query<AdvertiseSubmissionEntity>('SELECT * FROM advertise_submissions ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<AdvertiseSubmissionEntity | null> {
    return queryOne<AdvertiseSubmissionEntity>('SELECT * FROM advertise_submissions WHERE id = ?', [id]);
  }

  async insert(id: string, input: AdvertiseSubmissionInput): Promise<void> {
    await query(
      `INSERT INTO advertise_submissions
         (id, name, company_name, phone, email, country, city, budget_range, campaign_goal, tell_us_more)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.companyName,
        input.phone,
        input.email,
        input.country || null,
        input.city || null,
        input.budgetRange,
        input.campaignGoal,
        input.tellUsMore || null,
      ]
    );
  }
}
