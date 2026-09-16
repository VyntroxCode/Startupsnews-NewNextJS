import { query, queryOne } from '@/shared/database/connection';
import { PressReleaseSubmissionEntity, PressReleaseSubmissionInput } from '../domain/types';

type SqlParam = string | number | null;

function inputParams(input: PressReleaseSubmissionInput): SqlParam[] {
  return [
    input.name,
    input.companyName,
    input.phone,
    input.email,
    input.website || null,
    input.country || null,
    input.city || null,
  ];
}

export class PressReleaseSubmissionsRepository {
  async findAll(): Promise<PressReleaseSubmissionEntity[]> {
    return query<PressReleaseSubmissionEntity>('SELECT * FROM press_release_submissions ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<PressReleaseSubmissionEntity | null> {
    return queryOne<PressReleaseSubmissionEntity>('SELECT * FROM press_release_submissions WHERE id = ?', [id]);
  }

  async insert(id: string, input: PressReleaseSubmissionInput): Promise<void> {
    await query(
      `INSERT INTO press_release_submissions (id, name, company_name, phone, email, website, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...inputParams(input)]
    );
  }

  async update(id: string, input: PressReleaseSubmissionInput): Promise<void> {
    await query(
      `UPDATE press_release_submissions
       SET name = ?, company_name = ?, phone = ?, email = ?, website = ?, country = ?, city = ?
       WHERE id = ?`,
      [...inputParams(input), id]
    );
  }
}
