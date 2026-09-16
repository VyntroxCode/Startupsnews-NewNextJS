import { query, queryOne } from '@/shared/database/connection';
import { FundingRoundSubmissionEntity, FundingRoundSubmissionInput } from '../domain/types';

type SqlParam = string | number | null;

function inputParams(input: FundingRoundSubmissionInput): SqlParam[] {
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

export class FundingRoundSubmissionsRepository {
  async findAll(): Promise<FundingRoundSubmissionEntity[]> {
    return query<FundingRoundSubmissionEntity>('SELECT * FROM funding_round_submissions ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<FundingRoundSubmissionEntity | null> {
    return queryOne<FundingRoundSubmissionEntity>('SELECT * FROM funding_round_submissions WHERE id = ?', [id]);
  }

  async insert(id: string, input: FundingRoundSubmissionInput): Promise<void> {
    await query(
      `INSERT INTO funding_round_submissions (id, name, company_name, phone, email, website, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...inputParams(input)]
    );
  }

  async update(id: string, input: FundingRoundSubmissionInput): Promise<void> {
    await query(
      `UPDATE funding_round_submissions
       SET name = ?, company_name = ?, phone = ?, email = ?, website = ?, country = ?, city = ?
       WHERE id = ?`,
      [...inputParams(input), id]
    );
  }
}
