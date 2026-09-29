import { PartnershipEventFollowUpsRepository } from '../repository/partnership-event-follow-ups.repository';
import { PartnershipEventsRepository } from '../repository/partnership-events.repository';
import { FOLLOW_UP_MAX_LENGTH, PartnershipEventFollowUp, PartnershipEventFollowUpEntity } from '../domain/types';

function toFollowUp(e: PartnershipEventFollowUpEntity): PartnershipEventFollowUp {
  return { id: e.id, message: e.message, createdBy: e.created_by || '', createdAt: String(e.created_at) };
}

export class PartnershipEventFollowUpsService {
  constructor(
    private repository: PartnershipEventFollowUpsRepository,
    private eventsRepository: PartnershipEventsRepository,
  ) {}

  /** null when the event doesn't exist. */
  async list(partnershipEventId: number): Promise<PartnershipEventFollowUp[] | null> {
    if (!(await this.eventsRepository.findById(partnershipEventId))) return null;
    return (await this.repository.findByEvent(partnershipEventId)).map(toFollowUp);
  }

  /** Adds a note and returns the event's notes after it (newest first). null when the event doesn't exist. */
  async add(partnershipEventId: number, rawMessage: unknown, createdBy: string): Promise<PartnershipEventFollowUp[] | null> {
    const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
    if (!message) throw new Error('Follow up message is required.');
    if (message.length > FOLLOW_UP_MAX_LENGTH) throw new Error(`Follow up message is too long (max ${FOLLOW_UP_MAX_LENGTH} characters).`);
    if (!(await this.eventsRepository.findById(partnershipEventId))) return null;
    await this.repository.add(partnershipEventId, message, createdBy || null);
    return (await this.repository.findByEvent(partnershipEventId)).map(toFollowUp);
  }
}
