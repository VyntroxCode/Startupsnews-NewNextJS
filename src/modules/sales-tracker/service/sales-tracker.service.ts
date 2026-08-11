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

  async deleteAllLeads(): Promise<void> {
    await this.repository.deleteAllLeads();
  }

  async getTeam(): Promise<string[]> {
    const rows = await this.repository.findAllTeamMembers();
    return rows.map((r) => r.name);
  }

  async addTeamMember(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name is required');
    await this.repository.addTeamMember(trimmed);
  }

  async removeTeamMember(name: string): Promise<void> {
    await this.repository.removeTeamMember(name);
  }
}
