import { SalesTrackerRepository } from '../repository/sales-tracker.repository';
import { SalesLead } from '../domain/types';
import { entityToLead } from '../utils/sales-tracker.utils';

export class SalesTrackerService {
  constructor(private repository: SalesTrackerRepository) {}

  async getAllLeads(): Promise<SalesLead[]> {
    const rows = await this.repository.findAllLeads();
    return rows.map(entityToLead);
  }

  async saveLead(lead: SalesLead): Promise<SalesLead> {
    if (!lead.id) throw new Error('Lead id is required');
    if (!lead.name || !lead.name.trim()) throw new Error('Name is required');
    const saved = await this.repository.upsertLead(lead);
    return entityToLead(saved);
  }

  async deleteLead(id: string): Promise<void> {
    await this.repository.deleteLead(id);
  }
}
