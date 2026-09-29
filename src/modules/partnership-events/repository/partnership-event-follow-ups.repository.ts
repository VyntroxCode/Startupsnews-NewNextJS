import { query, getDbConnection } from '@/shared/database/connection';
import { FOLLOW_UP_KEEP_COUNT, PartnershipEventFollowUpEntity } from '../domain/types';

export class PartnershipEventFollowUpsRepository {
  /** Newest first, at most FOLLOW_UP_KEEP_COUNT (add() never lets more exist). */
  async findByEvent(partnershipEventId: number): Promise<PartnershipEventFollowUpEntity[]> {
    return query<PartnershipEventFollowUpEntity>(
      `SELECT * FROM partnership_event_follow_ups
       WHERE partnership_event_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${FOLLOW_UP_KEEP_COUNT}`,
      [partnershipEventId]
    );
  }

  /**
   * Inserts a note and, in the same transaction, deletes everything older than the newest
   * FOLLOW_UP_KEEP_COUNT for that event, so the table never holds more than that per event.
   * created_at is left to the column default — the caller can't choose the date.
   */
  async add(partnershipEventId: number, message: string, createdBy: string | null): Promise<void> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO partnership_event_follow_ups (partnership_event_id, message, created_by) VALUES (?, ?, ?)',
        [partnershipEventId, message, createdBy]
      );
      // MySQL/MariaDB won't take LIMIT inside an IN subquery directly; the derived table works around it.
      await connection.query(
        `DELETE FROM partnership_event_follow_ups
         WHERE partnership_event_id = ?
           AND id NOT IN (
             SELECT id FROM (
               SELECT id FROM partnership_event_follow_ups
               WHERE partnership_event_id = ?
               ORDER BY created_at DESC, id DESC
               LIMIT ${FOLLOW_UP_KEEP_COUNT}
             ) AS keep_rows
           )`,
        [partnershipEventId, partnershipEventId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
