import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export async function POST(req: NextRequest) {
  try {
    const { credential, accessToken, country, city } = await req.json() as { credential?: string; accessToken?: string; country?: string; city?: string };
    if (!credential && !accessToken) {
      return NextResponse.json({ success: false, error: 'No credential or access token provided.' }, { status: 400 });
    }

    let payload: { sub?: string; email?: string; name?: string; aud?: string; email_verified?: string } = {};

    if (accessToken) {
      // Fetch user profile from Google UserInfo API using access token
      const verifyRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!verifyRes.ok) {
        return NextResponse.json({ success: false, error: 'Invalid Google access token.' }, { status: 401 });
      }
      const data = await verifyRes.json() as { sub?: string; email?: string; name?: string };
      payload = {
        sub: data.sub,
        email: data.email,
        name: data.name,
      };
    } else if (credential) {
      // Verify token with Google
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!verifyRes.ok) {
        return NextResponse.json({ success: false, error: 'Invalid Google token.' }, { status: 401 });
      }

      const idTokenPayload = await verifyRes.json() as { sub?: string; email?: string; name?: string; aud?: string; email_verified?: string };

      if (GOOGLE_CLIENT_ID && idTokenPayload.aud !== GOOGLE_CLIENT_ID) {
        return NextResponse.json({ success: false, error: 'Token audience mismatch.' }, { status: 401 });
      }
      payload = idTokenPayload;
    }

    if (!payload.sub || !payload.email) {
      return NextResponse.json({ success: false, error: 'Incomplete Google profile.' }, { status: 400 });
    }

    const { user, isNew } = await repo.upsertGoogleUser({
      googleId: payload.sub,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      country: country || undefined,
      city: city || undefined,
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
        isNew,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, country: user.country, city: user.city, linkedin_url: user.linkedin_url, newsletter_category_slugs: user.newsletter_category_slugs ?? null },
      },
    });
  } catch (err) {
    console.error('[public-auth/google-verify]', err);
    return NextResponse.json({ success: false, error: 'Google sign-in failed. Please try again.' }, { status: 500 });
  }
}
