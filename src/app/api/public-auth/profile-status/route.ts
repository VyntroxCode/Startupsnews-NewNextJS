import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';
import type { PublicUserEntity } from '@/modules/public-users/domain/types';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

const CATEGORY_REQUIRED_FIELDS: Record<string, (keyof PublicUserEntity)[]> = {
  investor: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  vc: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  pe: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  familyoffice: ['i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus'],
  accelerator: ['a_program_name', 'a_duration', 'a_sector_focus'],
  incubator: ['a_program_name', 'a_duration', 'a_sector_focus'],
  creator: ['c_platforms', 'c_niche'],
  media: ['c_platforms', 'c_niche'],
  lawyer: ['l_firm', 'l_practice_areas', 'l_jurisdiction', 'l_years_experience'],
  cacs: ['cs_firm', 'cs_membership_number', 'cs_services', 'cs_years_experience'],
  ibanker: ['ib_firm', 'ib_years_experience', 'ib_deal_types'],
  banker: ['bk_bank_name', 'bk_years_experience', 'bk_vertical'],
  govt: ['g_role'],
  consultant: ['g_role'],
  coworking: ['g_role'],
  university: ['g_role'],
  student: ['g_role'],
  other: ['g_role'],
};

const STARTUP_REQUIRED_FIELDS: (keyof PublicUserEntity)[] = [
  's_name', 's_founded', 's_entity', 's_stage', 's_team_size', 's_revenue_status', 's_pitch', 's_raising',
];

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  let pubUserId: number;
  try {
    pubUserId = (jwt.verify(token, JWT_SECRET) as { pubUserId: number }).pubUserId;
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { user, founders, fundingRounds } = await repo.getProfileDetail(pubUserId);
  if (!user) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });

  const missing: string[] = [];
  let total = 5; // phone, country, city, linkedin_url, category

  if (!user.phone) missing.push('phone');
  if (!user.country) missing.push('country');
  if (!user.city) missing.push('city');
  if (!user.linkedin_url) missing.push('linkedin_url');
  if (!user.category) missing.push('category');

  if (user.category === 'other') {
    total += 1;
    if (!user.other_category) missing.push('other_category');
  }
  if (user.category === 'startup') {
    total += 1;
    if (!user.website) missing.push('website');
  }

  if (user.category === 'startup') {
    total += STARTUP_REQUIRED_FIELDS.length + 1; // + founders
    for (const f of STARTUP_REQUIRED_FIELDS) if (!user[f]) missing.push(f);
    if (founders.length === 0 || !founders[0]?.name) missing.push('founders');
  } else if (user.category) {
    const requiredFields = CATEGORY_REQUIRED_FIELDS[user.category] || [];
    total += requiredFields.length;
    for (const f of requiredFields) if (!user[f]) missing.push(f);
  }

  const percent = Math.round(((total - missing.length) / total) * 100);

  return NextResponse.json({
    success: true,
    data: {
      complete: missing.length === 0,
      missing,
      percent,
      user,
      founders,
      fundingRounds,
    },
  });
}
