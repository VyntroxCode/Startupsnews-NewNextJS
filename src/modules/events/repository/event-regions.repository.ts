import { query, queryOne } from '@/shared/database/connection';

// Initial seed list — only used the very first time the table is created.
const SEED_REGIONS = [
  'Africa', 'Amsterdam', 'Australia', 'Bengaluru', 'Berlin', 'China', 'Cohort',
  'Delhi NCR', 'Abu Dhabi', 'Dubai', 'Ghana', 'Hyderabad', 'International Events',
  'Kuwait', 'Madrid', 'Malaysia', 'Mumbai', 'Philippines', 'Riyadh', 'Saudi Arabia',
  'Singapore', 'Switzerland', 'Thailand', 'Turkey', 'UK', 'USA', 'Vietnam',
  'Kazakhstan', 'Egypt', 'Japan', 'Germany', 'Armenia', 'Bahrain', 'Ahmedabad',
  'Alibhag', 'Chennai', 'Jaipur', 'Nalgonda', 'West Bengal', 'Pune',
  'Other Cities', 'Online',
];

export interface EventRegion {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export class EventRegionsRepository {
  private migrated = false;

  async ensureTable(): Promise<void> {
    if (this.migrated) return;
    await query(`
      CREATE TABLE IF NOT EXISTS event_regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_name (name)
      )
    `);
    await this.seedIfEmpty();
    this.migrated = true;
  }

  private async seedIfEmpty(): Promise<void> {
    const result = await queryOne<{ count: number | bigint }>(
      'SELECT COUNT(*) as count FROM event_regions'
    );
    const count = result?.count ? Number(result.count) : 0;
    if (count > 0) return;

    // Seed all existing regions from the hardcoded constants
    const values = SEED_REGIONS.map((name, index) => `(${JSON.stringify(name)}, ${index})`).join(',\n');
    await query(`INSERT INTO event_regions (name, sort_order) VALUES ${values}`);
  }

  async findAll(): Promise<EventRegion[]> {
    await this.ensureTable();
    return query<EventRegion>(
      'SELECT * FROM event_regions ORDER BY name ASC'
    );
  }

  async findById(id: number): Promise<EventRegion | null> {
    await this.ensureTable();
    return queryOne<EventRegion>('SELECT * FROM event_regions WHERE id = ?', [id]);
  }

  async create(name: string, sortOrder?: number): Promise<EventRegion> {
    await this.ensureTable();
    const order =
      sortOrder !== undefined
        ? sortOrder
        : await this.nextSortOrder();
    await query(
      'INSERT INTO event_regions (name, sort_order) VALUES (?, ?)',
      [name.trim(), order]
    );
    const region = await queryOne<EventRegion>(
      'SELECT * FROM event_regions WHERE name = ?',
      [name.trim()]
    );
    return region!;
  }

  async update(id: number, data: { name?: string; sort_order?: number }): Promise<EventRegion> {
    await this.ensureTable();
    const fields: string[] = [];
    const params: (string | number)[] = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      params.push(data.sort_order);
    }
    if (fields.length > 0) {
      params.push(id);
      await query(`UPDATE event_regions SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return (await this.findById(id))!;
  }

  async delete(id: number): Promise<void> {
    await this.ensureTable();
    await query('DELETE FROM event_regions WHERE id = ?', [id]);
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    await this.ensureTable();
    let sql = 'SELECT COUNT(*) as count FROM event_regions WHERE name = ?';
    const params: (string | number)[] = [name.trim()];
    if (excludeId !== undefined) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const result = await queryOne<{ count: number | bigint }>(sql, params);
    return result?.count ? Number(result.count) > 0 : false;
  }

  private async nextSortOrder(): Promise<number> {
    const result = await queryOne<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM event_regions'
    );
    return (result?.max_order ?? -1) + 1;
  }
}
