import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';
import { PHONE_RULES } from '@/components/ui/constants/phone';
import { requireJwtSecret } from '@/shared/config/jwt-secret';

const JWT_SECRET = requireJwtSecret();

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, country, city, timezone, password } = await req.json() as {
      name?: string; email?: string; phone?: string; country?: string; city?: string; timezone?: string; password?: string;
    };

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Name must be at least 2 characters.' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
    }
    // Mobile arrives as "+91 9876543210" (dial code from the popup's picker, then the number);
    // checked against that country's digit rule and stored in the same spaced format the profile wizard reads.
    const phoneMatch = (phone || '').trim().match(/^(\+\d{1,5})\s+([\d\s\-()]+)$/);
    const phoneCode = phoneMatch?.[1] || '';
    const phoneNumber = (phoneMatch?.[2] || '').replace(/\D/g, '');
    const phoneRule = PHONE_RULES[phoneCode];
    if (!phoneRule) {
      return NextResponse.json({ success: false, error: 'A valid mobile number with country code is required.' }, { status: 400 });
    }
    if (!phoneRule.pattern.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: phoneRule.message }, { status: 400 });
    }
    const cleanPhone = `${phoneCode} ${phoneNumber}`;
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await repo.findByEmail(normalizedEmail);
    if (existing) {
      // Google/LinkedIn accounts have no password — point them at the right sign-in instead.
      const error = existing.password_hash
        ? 'An account with this email already exists. Please sign in instead.'
        : `This email is already registered with ${existing.auth_provider === 'linkedin' ? 'LinkedIn' : 'Google'}. Please use Continue with Google.`;
      return NextResponse.json({ success: false, error }, { status: 409 });
    }

    const user = await repo.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: cleanPhone,
      country: country || undefined,
      city: city || undefined,
      timezone: timezone || undefined,
      password,
    });

    const token = jwt.sign(
      { pubUserId: user.id, email: user.email, type: 'public' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        isNew: true,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, country: user.country, city: user.city, linkedin_url: user.linkedin_url, newsletter_category_slugs: user.newsletter_category_slugs ?? null, created_at: user.created_at },
      },
    });
  } catch (err) {
    console.error('[public-auth/register]', err);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
