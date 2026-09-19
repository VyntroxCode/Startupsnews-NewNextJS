/** How a visitor is taking part in Expand North Star — the "Participating As" dropdown on the
 * closing form of /expand-north-star.
 *
 * One list for both sides: the form renders these options and the API only accepts these values,
 * so the two can never disagree. Plain data with no server imports, so the client form can import
 * it (the same way `CountryCityFields` imports `partnership-events/domain/country-city-data`).
 *
 * The first four are the two packages in the page's participation-fee section, for one person or
 * two; `package` says which, so the form can show that package's inclusions. Labels are the ones the team supplied, with spelling tidied ("Deligate" → Delegate,
 * "-ooth" → Booth). */
export type ParticipationPackage = 'delegate' | 'booth';

export const PARTICIPATION_OPTIONS = [
  { value: 'delegate-1', label: 'One Person as Delegate', package: 'delegate' },
  { value: 'delegate-2', label: 'Two Persons as Delegates', package: 'delegate' },
  { value: 'booth-1', label: 'One Person with Booth / POD', package: 'booth' },
  { value: 'booth-2', label: 'Two Persons with Booth / POD', package: 'booth' },
  { value: 'others', label: 'Others (Share Your Requirement)', package: null },
] as const satisfies readonly { value: string; label: string; package: ParticipationPackage | null }[];

export interface Inclusion {
  text: string;
  /** Marks the one line a package adds over the other. */
  highlight?: boolean;
}

// Reworded on request, 2026-09-19 (GITEX kept in the brand's own capitals).
const DELEGATE_INCLUSIONS: Inclusion[] = [
  { text: 'Access to GITEX & North Star Entry (All Days)' },
  { text: 'Access to Side Events' },
  { text: 'Accommodation for 6D/5N' },
  { text: 'Return air fare' },
  { text: '30 Days Single Entry UAE Visa' },
];

/** What each package includes — the single list behind both the participation-fee cards on the
 * page and the inclusions box the form opens under a chosen package, so the two can't disagree.
 * As supplied by the team, spelling tidied ("accomadation", "viza", "NorthStar"; later "Exibition").
 * The booth package is the delegate package plus a one-day exhibition pod. */
export const PACKAGE_INCLUSIONS: Record<ParticipationPackage, Inclusion[]> = {
  delegate: DELEGATE_INCLUSIONS,
  booth: [{ text: 'Exhibition (POD) for One Day', highlight: true }, ...DELEGATE_INCLUSIONS],
};

export type ParticipationValue = (typeof PARTICIPATION_OPTIONS)[number]['value'];

/** The option that asks the visitor to describe what they need in their own words. */
export const PARTICIPATION_OTHERS: ParticipationValue = 'others';

/** Longest free-text requirement accepted under "Others". */
export const REQUIREMENT_MAX_LENGTH = 1000;

export function isParticipationValue(value: string): value is ParticipationValue {
  return PARTICIPATION_OPTIONS.some((option) => option.value === value);
}

export function participationLabel(value: string): string {
  return PARTICIPATION_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function packageFor(value: string): ParticipationPackage | null {
  return PARTICIPATION_OPTIONS.find((option) => option.value === value)?.package ?? null;
}
