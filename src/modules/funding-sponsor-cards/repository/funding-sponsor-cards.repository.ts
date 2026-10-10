import { query, queryOne } from '@/shared/database/connection';
import type { ReaderSponsorCard, SponsorCard, SponsorCardInput } from '../domain/types';
import { MAX_ACTIVE_SPONSOR_CARDS } from '../domain/types';

type DbRow = Record<string, unknown>;

const COLUMNS = 'id, title, subtitle, image_url, link_url, is_active, created_at, updated_at';

/** TIMESTAMP columns arrive as Date objects from the mariadb driver. */
function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}

function toCard(row: DbRow): SponsorCard {
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    imageUrl: (row.image_url as string | null) || null,
    linkUrl: String(row.link_url ?? ''),
    isActive: Number(row.is_active) === 1,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export class FundingSponsorCardsRepository {
  /** Every card, oldest first — the order they show in, in the admin list and on the reader page. */
  async list(): Promise<SponsorCard[]> {
    const rows = await query<DbRow>(`SELECT ${COLUMNS} FROM funding_sponsor_cards ORDER BY id ASC`);
    return rows.map(toCard);
  }

  async findById(id: number): Promise<SponsorCard | null> {
    const row = await queryOne<DbRow>(`SELECT ${COLUMNS} FROM funding_sponsor_cards WHERE id = ?`, [id]);
    return row ? toCard(row) : null;
  }

  /** The cards switched on for the reader page. LIMIT is a second guard behind the API's own cap. */
  async listActive(): Promise<ReaderSponsorCard[]> {
    const rows = await query<DbRow>(
      `SELECT id, title, subtitle, image_url, link_url FROM funding_sponsor_cards WHERE is_active = 1 ORDER BY id ASC LIMIT ${MAX_ACTIVE_SPONSOR_CARDS}`
    );
    return rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title ?? ''),
      subtitle: String(row.subtitle ?? ''),
      imageUrl: (row.image_url as string | null) || null,
      linkUrl: String(row.link_url ?? ''),
    }));
  }

  /** COUNT(*) comes back from the mariadb driver as BigInt. */
  async count(): Promise<number> {
    const row = await queryOne<DbRow>('SELECT COUNT(*) AS n FROM funding_sponsor_cards');
    return Number(row?.n ?? 0);
  }

  /** Active cards other than `exceptId` — how many slots are taken before this card is switched on. */
  async countActive(exceptId = 0): Promise<number> {
    const row = await queryOne<DbRow>('SELECT COUNT(*) AS n FROM funding_sponsor_cards WHERE is_active = 1 AND id <> ?', [exceptId]);
    return Number(row?.n ?? 0);
  }

  async create(input: SponsorCardInput, createdBy: string): Promise<SponsorCard | null> {
    const result = (await query(
      'INSERT INTO funding_sponsor_cards (title, subtitle, image_url, link_url, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [input.title, input.subtitle, input.imageUrl, input.linkUrl, input.isActive ? 1 : 0, createdBy]
    )) as unknown as Array<{ insertId?: number | bigint }>;
    const insertId = Number(result[0]?.insertId ?? 0);
    return insertId ? this.findById(insertId) : null;
  }

  async update(id: number, input: SponsorCardInput): Promise<SponsorCard | null> {
    await query(
      'UPDATE funding_sponsor_cards SET title = ?, subtitle = ?, image_url = ?, link_url = ?, is_active = ? WHERE id = ?',
      [input.title, input.subtitle, input.imageUrl, input.linkUrl, input.isActive ? 1 : 0, id]
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM funding_sponsor_cards WHERE id = ?', [id]);
  }
}
