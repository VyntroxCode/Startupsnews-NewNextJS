// Seeds 20 sample contacts into the `contacts` table for testing the Network Manager UI.
// Usage: npx tsx scripts/seed-contacts.ts
// Creates the table first (scripts/migrations/add-contacts-table.sql) if it doesn't exist yet.

import { readFileSync } from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import { query } from '@/shared/database/connection';

const SAMPLE_CONTACTS = [
  { name: 'Aarav Mehta', company: 'Finzo', types: ['Startup'], cities: ['Mumbai'], country: 'India', emails: ['aarav@finzo.io'], phones: ['+91 98200 11111'], linkedin: 'linkedin.com/in/aaravmehta', instagram: '@aaravmehta', sector: 'Fintech', stage: 'Seed', tags: ['Pitching'], notes: 'Met at SNF Mumbai meetup.' },
  { name: 'Priya Nair', company: 'GreenCart', types: ['Startup'], cities: ['Bangalore'], country: 'India', emails: ['priya@greencart.in'], phones: ['+91 98200 22222'], linkedin: 'linkedin.com/in/priyanair', instagram: '@priyanair', sector: 'D2C', stage: 'Series A', tags: ['Grants'], notes: 'Interested in Dubai delegation.' },
  { name: 'Rohan Kapoor', company: 'Kapoor Ventures', types: ['Investor', 'VC Fund'], cities: ['Delhi'], country: 'India', emails: ['rohan@kapoorventures.com'], phones: ['+91 98200 33333'], linkedin: 'linkedin.com/in/rohankapoor', instagram: '', sector: 'Fund', stage: '', tags: ['VC', 'Fund'], notes: 'Focus on seed-stage SaaS.' },
  { name: 'Sara Al Farsi', company: 'Gulf Angels', types: ['Angel Investor'], cities: ['Dubai'], country: 'UAE', emails: ['sara@gulfangels.ae'], phones: ['+971 50 111 1111'], linkedin: 'linkedin.com/in/saraalfarsi', instagram: '@saraalfarsi', sector: 'Angel Investor', stage: 'Angel', tags: ['Angel Investor', 'Dubai Delegation'], notes: 'Attended Dubai Trade event.' },
  { name: 'Vikram Singh', company: 'Singh & Co Media', types: ['Media'], cities: ['Jaipur'], country: 'India', emails: ['vikram@singhmedia.com'], phones: ['+91 98200 44444'], linkedin: '', instagram: '@singhmedia', sector: 'Media', stage: '', tags: ['PR'], notes: 'Covers startup ecosystem news.' },
  { name: 'Neha Verma', company: 'Verma Foods', types: ['Sponsor'], cities: ['Gurugram'], country: 'India', emails: ['neha@vermafoods.com'], phones: ['+91 98200 55555'], linkedin: 'linkedin.com/in/nehaverma', instagram: '', sector: 'F&B', stage: '', tags: ['Food Partner', 'Sponsor'], notes: 'Sponsored SNF Gurugram 2026.' },
  { name: 'James Whitfield', company: 'Whitfield Capital', types: ['VC Fund'], cities: ['London'], country: 'UK', emails: ['james@whitfieldcap.co.uk'], phones: ['+44 7700 111111'], linkedin: 'linkedin.com/in/jameswhitfield', instagram: '', sector: 'VC', stage: 'Series A', tags: ['VC', 'Fund'], notes: 'Looking at India market entry.' },
  { name: 'Fatima Rahman', company: 'Startup Hub Singapore', types: ['Venue partner'], cities: ['Singapore'], country: 'Singapore', emails: ['fatima@startuphub.sg'], phones: ['+65 8111 1111'], linkedin: '', instagram: '@startuphubsg', sector: 'Venture Studio', stage: '', tags: ['Venue Partner', 'Event Partner'], notes: 'Hosted SNF Singapore pitch night.' },
  { name: 'Arjun Rao', company: 'CloudNine Tech', types: ['Startup'], cities: ['Bangalore'], country: 'India', emails: ['arjun@cloudnine.tech'], phones: ['+91 98200 66666'], linkedin: 'linkedin.com/in/arjunrao', instagram: '', sector: 'SaaS', stage: 'Pre-seed', tags: ['Incubation'], notes: 'Applied for accelerator batch.' },
  { name: 'Emily Chen', company: 'Chen Family Office', types: ['Angel Fund'], cities: ['Singapore'], country: 'Singapore', emails: ['emily@chenfo.sg'], phones: ['+65 8222 2222'], linkedin: 'linkedin.com/in/emilychen', instagram: '', sector: 'Fund', stage: 'Angel', tags: ['Angel Investor'], notes: 'Backs consumer tech founders.' },
  { name: 'Karan Malhotra', company: 'Malhotra Realty', types: ['Sponsor'], cities: ['Delhi'], country: 'India', emails: ['karan@malhotrarealty.com'], phones: ['+91 98200 77777'], linkedin: '', instagram: '', sector: 'Real Estate', stage: '', tags: ['Sponsor'], notes: 'Interested in venue sponsorship.' },
  { name: 'Layla Hassan', company: 'Hassan Ventures', types: ['VC Fund', 'Investor'], cities: ['Dubai'], country: 'UAE', emails: ['layla@hassanventures.ae'], phones: ['+971 50 222 2222'], linkedin: 'linkedin.com/in/laylahassan', instagram: '@laylahassan', sector: 'VC', stage: 'Series A', tags: ['VC', 'Dubai Delegation'], notes: 'Co-invested with regional funds.' },
  { name: 'Devansh Patel', company: 'PatelWorks', types: ['Startup'], cities: ['Ahmedabad'], country: 'India', emails: ['devansh@patelworks.in'], phones: ['+91 98200 88888'], linkedin: '', instagram: '', sector: 'Manufacturing', stage: 'Seed', tags: ['Pitching'], notes: 'Manufacturing-tech startup.' },
  { name: 'Olivia Brown', company: 'Brown Media Group', types: ['Media'], cities: ['London'], country: 'UK', emails: ['olivia@brownmedia.co.uk'], phones: ['+44 7700 222222'], linkedin: 'linkedin.com/in/oliviabrown', instagram: '@brownmediagroup', sector: 'Media', stage: '', tags: ['PR'], notes: 'European startup press contact.' },
  { name: 'Rahul Iyer', company: 'Iyer Angel Network', types: ['Angel Investor'], cities: ['Mumbai'], country: 'India', emails: ['rahul@iyerangels.com'], phones: ['+91 98200 99999'], linkedin: 'linkedin.com/in/rahuliyer', instagram: '', sector: 'Angel Investor', stage: 'Angel', tags: ['Angel Investor'], notes: 'Writes small checks, fast decisions.' },
  { name: 'Sophia Müller', company: 'Müller Studio', types: ['Venture Studio', 'Partner'], cities: ['Dubai'], country: 'UAE', emails: ['sophia@muellerstudio.com'], phones: ['+971 50 333 3333'], linkedin: '', instagram: '@muellerstudio', sector: 'Venture Studio', stage: '', tags: ['Venture Studio', 'Accelerator'], notes: 'Runs a venture builder program.' },
  { name: 'Aditi Sharma', company: 'Sharma & Associates', types: ['Mentor'], cities: ['Gurugram'], country: 'India', emails: ['aditi@sharmaassociates.com'], phones: ['+91 98201 11111'], linkedin: 'linkedin.com/in/aditisharma', instagram: '', sector: 'Legal', stage: '', tags: [], notes: 'Legal mentor for early-stage founders.' },
  { name: 'Michael Osei', company: 'Osei Fintech', types: ['Startup'], cities: ['London'], country: 'UK', emails: ['michael@oseifintech.com'], phones: ['+44 7700 333333'], linkedin: '', instagram: '', sector: 'Fintech', stage: 'Series A', tags: ['Fund'], notes: 'Raising Series A, fintech infra.' },
  { name: 'Ananya Desai', company: 'Desai Wellness', types: ['Startup'], cities: ['Mumbai'], country: 'India', emails: ['ananya@desaiwellness.in'], phones: ['+91 98201 22222'], linkedin: 'linkedin.com/in/ananyadesai', instagram: '@desaiwellness', sector: 'Healthtech', stage: 'Seed', tags: ['Pitching', 'Grants'], notes: 'D2C wellness brand, growing fast.' },
  { name: 'Omar Khalid', company: 'Khalid Partners', types: ['VC Fund', 'Sponsor'], cities: ['Dubai'], country: 'UAE', emails: ['omar@khalidpartners.ae'], phones: ['+971 50 444 4444'], linkedin: 'linkedin.com/in/omarkhalid', instagram: '', sector: 'VC', stage: 'Series A', tags: ['VC', 'Sponsor', 'Dubai Delegation'], notes: 'Co-sponsoring the Q3 summit.' },
];

async function ensureTable() {
  const sqlPath = path.join(__dirname, 'migrations', 'add-contacts-table.sql');
  const raw = readFileSync(sqlPath, 'utf8');
  const statements = raw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.toUpperCase().startsWith('--') && s.toUpperCase() !== 'USE ZOX_DB');
  for (const stmt of statements) {
    await query(stmt);
  }
}

async function main() {
  await ensureTable();

  for (const c of SAMPLE_CONTACTS) {
    await query(
      `INSERT INTO contacts (name, company, types, cities, country, emails, phones, linkedin, instagram, sector, stage, tags, notes, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.name,
        c.company || null,
        JSON.stringify(c.types),
        JSON.stringify(c.cities),
        c.country || null,
        JSON.stringify(c.emails),
        JSON.stringify(c.phones),
        c.linkedin || null,
        c.instagram || null,
        c.sector || null,
        c.stage || null,
        JSON.stringify(c.tags),
        c.notes || null,
        'seed-script',
        'seed-script',
      ]
    );
    console.log(`Inserted: ${c.name} (${c.company})`);
  }

  console.log(`\nDone — inserted ${SAMPLE_CONTACTS.length} contacts.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
