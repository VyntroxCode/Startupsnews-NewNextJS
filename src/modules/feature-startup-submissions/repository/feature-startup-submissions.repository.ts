import { query, queryOne } from '@/shared/database/connection';
import { FeatureStartupSubmissionEntity, FeatureStartupSubmissionInput } from '../domain/types';

type SqlParam = string | number | null;

function inputParams(input: FeatureStartupSubmissionInput): SqlParam[] {
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

export class FeatureStartupSubmissionsRepository {
  async findAll(): Promise<FeatureStartupSubmissionEntity[]> {
    return query<FeatureStartupSubmissionEntity>('SELECT * FROM feature_startup_submissions ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<FeatureStartupSubmissionEntity | null> {
    return queryOne<FeatureStartupSubmissionEntity>('SELECT * FROM feature_startup_submissions WHERE id = ?', [id]);
  }

  async insert(id: string, input: FeatureStartupSubmissionInput): Promise<void> {
    await query(
      `INSERT INTO feature_startup_submissions (id, name, company_name, phone, email, website, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...inputParams(input)]
    );
  }

  async update(id: string, input: FeatureStartupSubmissionInput): Promise<void> {
    await query(
      `UPDATE feature_startup_submissions
       SET name = ?, company_name = ?, phone = ?, email = ?, website = ?, country = ?, city = ?
       WHERE id = ?`,
      [...inputParams(input), id]
    );
  }
}
