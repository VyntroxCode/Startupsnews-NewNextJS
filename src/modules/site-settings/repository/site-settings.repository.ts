import { query } from '@/shared/database/connection';

/** Key/value rows in `site_settings` (footer copyright, feature-startup hero images, ...). The
 * table is created lazily, matching the API routes that have always done the same. */
export class SiteSettingsRepository {
  async ensureTable(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(120) NOT NULL UNIQUE,
        \`value\` TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  /** Values for `keys`; keys with no row are absent from the map. */
  async getMany(keys: string[]): Promise<Map<string, string | null>> {
    if (keys.length === 0) return new Map();
    await this.ensureTable();
    const rows = await query<{ key: string; value: string | null }>(
      `SELECT \`key\`, \`value\` FROM site_settings WHERE \`key\` IN (${keys.map(() => '?').join(', ')})`,
      keys
    );
    return new Map(rows.map((r) => [r.key, r.value]));
  }
}
