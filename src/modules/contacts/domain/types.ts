// JSON columns: the `mariadb` driver auto-parses these into arrays, but the raw
// mysql JSON type is untyped from our side, so we accept either shape defensively.
type JsonArrayColumn = string[] | string | null;

export interface ContactEntity {
  id: number;
  name: string;
  company: string | null;
  types: JsonArrayColumn;
  cities: JsonArrayColumn;
  country: string | null;
  emails: JsonArrayColumn;
  phones: JsonArrayColumn;
  linkedin: string | null;
  instagram: string | null;
  sector: string | null;
  stage: string | null;
  tags: JsonArrayColumn;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Contact {
  id: number;
  name: string;
  company: string;
  types: string[];
  cities: string[];
  country: string;
  emails: string[];
  phones: string[];
  linkedin: string;
  instagram: string;
  sector: string;
  stage: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  name: string;
  company?: string;
  types: string[];
  cities?: string[];
  country?: string;
  emails?: string[];
  phones?: string[];
  linkedin?: string;
  instagram?: string;
  sector?: string;
  stage?: string;
  tags?: string[];
  notes?: string;
}

export interface ContactFilters {
  search?: string;
  city?: string;
  country?: string;
  type?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export type BulkAction = 'setCity' | 'setCountry' | 'addTag' | 'delete';

export interface ContactsConfig {
  types: string[];
  cities: string[];
  countries: string[];
  tags: string[];
}

export const DEFAULT_CONTACTS_CONFIG: ContactsConfig = {
  types: ['Startup', 'Investor', 'VC Fund', 'Angel Investor', 'Angel Fund', 'Sponsor', 'Venue partner', 'Media', 'Mentor', 'Partner', 'Other'],
  cities: ['Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Gurugram', 'Dubai', 'Singapore', 'London'],
  countries: ['India', 'UAE', 'Singapore', 'UK', 'USA', 'Other'],
  tags: ['Dubai Delegation', 'PR', 'Pitching', 'Incubation', 'Acceleration', 'Dubai Trade', 'Grants', 'Sponsor', 'Venue Partner', 'Food Partner', 'Event Partner', 'Startup Meetup', 'Angel Investor', 'Fund', 'VC', 'Venture Studio', 'Accelerator'],
};
