import type { Speaker } from '@/modules/partnership-events/domain/types';

export interface SocialImageItem {
  src: string;
  filename: string;
}

export type SocialImageData = Record<string, SocialImageItem[]>;

export interface SubmitEventFormData {
  organizerName: string;
  organizerOrg: string;
  organizerEmail: string;
  phoneCode: string;
  phoneCodeCustom: string;
  phoneNumber: string;

  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  country: string;
  countryOther: string;
  city: string;
  cityOther: string;
  externalUrl: string;
  eventType: string;
  description: string;

  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueAddress: string;
  venueMapLink: string;
  speakers: Speaker[];

  image1: string;
  image1Filename: string;
  image3: string;
  image3Filename: string;
  socialImages: SocialImageData;
}

export const SOCIAL_SLOT_KEYS = ['social-1', 'social-2', 'social-3', 'social-4'] as const;

export function createInitialFormData(): SubmitEventFormData {
  return {
    organizerName: '',
    organizerOrg: '',
    organizerEmail: '',
    phoneCode: '+91',
    phoneCodeCustom: '',
    phoneNumber: '',

    title: '',
    slug: '',
    slugManuallyEdited: false,
    country: '',
    countryOther: '',
    city: '',
    cityOther: '',
    externalUrl: '',
    eventType: '',
    description: '',

    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    venueAddress: '',
    venueMapLink: '',
    speakers: [],

    image1: '',
    image1Filename: '',
    image3: '',
    image3Filename: '',
    socialImages: { 'social-1': [], 'social-2': [], 'social-3': [], 'social-4': [] },
  };
}

export type FieldErrors = Record<string, string>;
