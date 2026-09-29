import type { LeadSource } from '@/modules/lead-assignments/domain/types';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';
import { entityToLead } from '@/modules/sales-tracker/utils/sales-tracker.utils';
import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import { FeatureStartupSubmissionsRepository } from '@/modules/feature-startup-submissions/repository/feature-startup-submissions.repository';
import { entityToSubmission as featureToSubmission } from '@/modules/feature-startup-submissions/service/feature-startup-submissions.service';
import { FEATURE_PAGE_LEAD_TYPE } from '@/modules/feature-startup-submissions/service/to-sales-lead';
import { FundingRoundSubmissionsRepository } from '@/modules/funding-round-submissions/repository/funding-round-submissions.repository';
import { entityToSubmission as fundingToSubmission } from '@/modules/funding-round-submissions/service/funding-round-submissions.service';
import { FUNDING_ROUND_PAGE_LEAD_TYPE } from '@/modules/funding-round-submissions/service/to-sales-lead';
import { PressReleaseSubmissionsRepository } from '@/modules/press-release-submissions/repository/press-release-submissions.repository';
import { entityToSubmission as pressToSubmission } from '@/modules/press-release-submissions/service/press-release-submissions.service';
import { PRESS_RELEASE_PAGE_LEAD_TYPE } from '@/modules/press-release-submissions/service/to-sales-lead';
import { SponsorEventSubmissionsRepository } from '@/modules/sponsor-event-submissions/repository/sponsor-event-submissions.repository';
import { entityToSubmission as sponsorToSubmission } from '@/modules/sponsor-event-submissions/service/sponsor-event-submissions.service';
import { SPONSOR_EVENT_PAGE_LEAD_TYPE } from '@/modules/sponsor-event-submissions/service/to-sales-lead';
import { EnsTravelEnquiriesRepository } from '@/modules/ens-travel-enquiries/repository/ens-travel-enquiries.repository';
import { entityToEnquiry } from '@/modules/ens-travel-enquiries/service/ens-travel-enquiries.service';
import { PACKAGE_INCLUSIONS, packageFor, participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import type { LeadDetailField, LeadDetailFieldKind, LeadSubmission } from '../domain/types';

/** Must match components/admin/sales-tracker/constants.ts ENS_ENQUIRY_TYPE_LABEL and the page key
 * lead-assignments' findForEmployee gives an 'ens' row. */
const ENS_PAGE = 'Expand North Star Enquiry';

const field = (label: string, value: string | null | undefined, kind: LeadDetailFieldKind = 'text'): LeadDetailField => ({
  label,
  value: (value ?? '').trim(),
  kind,
});

/** The three shared lead forms collect the same six fields. */
function sharedLeadForm(
  page: string,
  s: { name: string; companyName: string; phone: string; email: string; website: string; country: string; city: string; createdAt?: string }
): LeadSubmission {
  return {
    page,
    origin: 'submission',
    submittedAt: s.createdAt || '',
    name: s.name,
    contact: s.phone,
    email: s.email,
    sections: [
      {
        title: 'Contact',
        fields: [field('Name', s.name), field('Company name', s.companyName), field('Phone / WhatsApp', s.phone, 'phone'), field('Official email', s.email, 'email')],
      },
      {
        title: 'Company',
        fields: [field('Website', s.website, 'url'), field('Country', s.country), field('City', s.city)],
      },
    ],
  };
}

/** A lead added by hand in the Sales Tracker — or a page lead whose original submission record is
 * missing — shown from the tracker's own row. */
function fromTracker(lead: SalesLead): LeadSubmission {
  const hasEvent = !!(lead.eventTitle || lead.eventDate || lead.description || lead.posterUrl);
  return {
    page: lead.type,
    origin: 'tracker',
    submittedAt: lead.date,
    name: lead.name,
    contact: lead.contact,
    email: lead.email,
    sections: [
      {
        title: 'Contact',
        fields: [field('Name', lead.name), field('Company name', lead.company), field('Contact number', lead.contact, 'phone'), field('Email', lead.email, 'email'), field('Country', lead.country), field('City', lead.city)],
      },
      {
        title: 'Lead',
        fields: [
          field('Source of lead', lead.source),
          field('Type of lead', lead.type === 'Others' && lead.otherType ? `Others — ${lead.otherType}` : lead.type),
          field('Query', lead.query, 'long'),
        ],
      },
      ...(hasEvent
        ? [{
            title: 'Event',
            fields: [
              field('Event title', lead.eventTitle),
              field('Event URL / slug', lead.eventSlug),
              field('Event date', lead.eventDate),
              field('Event time', lead.eventTime),
              field('External link', lead.externalUrl, 'url'),
              field('Poster', lead.posterUrl, 'image'),
              field('Description', lead.description, 'long'),
            ],
          }]
        : []),
    ],
  };
}

async function fromPageLead(lead: SalesLead): Promise<LeadSubmission | null> {
  switch (lead.type) {
    case FEATURE_PAGE_LEAD_TYPE: {
      const e = await new FeatureStartupSubmissionsRepository().findById(lead.id);
      return e ? sharedLeadForm(lead.type, featureToSubmission(e)) : null;
    }
    case FUNDING_ROUND_PAGE_LEAD_TYPE: {
      const e = await new FundingRoundSubmissionsRepository().findById(lead.id);
      return e ? sharedLeadForm(lead.type, fundingToSubmission(e)) : null;
    }
    case PRESS_RELEASE_PAGE_LEAD_TYPE: {
      const e = await new PressReleaseSubmissionsRepository().findById(lead.id);
      return e ? sharedLeadForm(lead.type, pressToSubmission(e)) : null;
    }
    case SPONSOR_EVENT_PAGE_LEAD_TYPE: {
      const e = await new SponsorEventSubmissionsRepository().findById(lead.id);
      if (!e) return null;
      const s = sponsorToSubmission(e);
      return {
        page: lead.type,
        origin: 'submission',
        submittedAt: s.createdAt || '',
        name: s.contactName,
        contact: s.phone,
        email: s.contactEmail,
        sections: [
          {
            title: 'Contact',
            fields: [field('Your name', s.contactName), field('Your email', s.contactEmail, 'email'), field('Phone', s.phone, 'phone')],
          },
          {
            title: 'Event',
            fields: [
              field('Event title', s.eventTitle),
              field('Event URL', s.eventSlug ? `startupnews.fyi/events/${s.eventSlug}` : ''),
              field('Date', s.eventDate),
              field('Time', s.eventTime),
              field('Location', s.location),
              field('Country', s.country),
              field('City', s.city),
              field('External URL / redirection link', s.externalUrl, 'url'),
              field('Description', s.description, 'long'),
              field('Event poster', s.posterUrl, 'image'),
            ],
          },
        ],
      };
    }
    default:
      return null;
  }
}

async function fromEnsEnquiry(id: string): Promise<LeadSubmission | null> {
  const e = await new EnsTravelEnquiriesRepository().findById(id);
  if (!e) return null;
  const q = entityToEnquiry(e);
  const pack = packageFor(q.participation);
  return {
    page: ENS_PAGE,
    origin: 'submission',
    submittedAt: q.createdAt,
    name: q.name,
    contact: q.contact,
    email: q.email,
    sections: [
      {
        title: 'Contact',
        fields: [field('Full name', q.name), field('Email', q.email, 'email'), field('Contact number', q.contact, 'phone')],
      },
      { title: 'Travelling from', fields: [field('City', q.city), field('Country', q.country)] },
      {
        title: 'Participation',
        fields: [
          field('Participating as', participationLabel(q.participation)),
          pack
            ? field('Package inclusions', PACKAGE_INCLUSIONS[pack].map((i) => i.text).join('\n'), 'list')
            : field('Requirement', q.requirement, 'long'),
        ],
      },
      {
        title: 'Source',
        fields: [field('Referred by', referredByLabel(q.referredBy)), field('How they found us', foundUsText(q.foundUs, q.foundUsDetail))],
      },
    ],
  };
}

/** Everything the visitor filled in on the lead's page, read from that page's own submission
 * record (the untouched original — the Sales Tracker row is the admin-editable working copy).
 * Returns null when the lead no longer exists. */
export async function buildLeadSubmission(source: LeadSource, leadId: string): Promise<LeadSubmission | null> {
  if (source === 'ens') return fromEnsEnquiry(leadId);
  const row = await new SalesTrackerRepository().findLeadById(leadId);
  if (!row) return null;
  const lead = entityToLead(row);
  return (await fromPageLead(lead)) ?? fromTracker(lead);
}
