import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new NextResponse(`Error from LinkedIn: ${error}`);
    }

    if (!code) {
      return new NextResponse('No code provided by LinkedIn', { status: 400 });
    }

    const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '86bc9tenkei7os';
    const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || 'dGH3oVM3EsmUqKdx';
    const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dev.thebackend.in';
    const redirectUri = `${NEXT_PUBLIC_SITE_URL}/api/public-auth/linkedin/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('LinkedIn Token Error:', errText);
      return new NextResponse('Failed to exchange token with LinkedIn', { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('LinkedIn Profile Error:', errText);
      return new NextResponse('Failed to fetch profile from LinkedIn', { status: 500 });
    }

    const profileData = await profileRes.json() as { sub: string, name: string, email: string, picture?: string };

    // 3. Detect location from IP
    let country: string | undefined;
    let city: string | undefined;
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) });
        if (geoRes.ok) {
          const geo = await geoRes.json() as { country_name?: string; city?: string };
          country = geo.country_name || undefined;
          city = geo.city || undefined;
        }
      }
    } catch { /* geo is best-effort */ }

    // 4. Upsert user
    const { user, isNew } = await repo.upsertLinkedinUser({
      linkedinId: profileData.sub,
      name: profileData.name || profileData.email.split('@')[0],
      email: profileData.email,
      country,
      city,
    });

    const token = jwt.sign(
      { pubUserId: user.id, email: user.email, type: 'public' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, country: user.country, city: user.city, linkedin_url: user.linkedin_url };

    // 4. Return HTML to set localStorage and redirect
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Authenticating...</title></head>
        <body>
          <p>Authenticating, please wait...</p>
          <script>
            localStorage.setItem('pub_auth_token', '${token}');
            localStorage.setItem('pub_auth_user', JSON.stringify(${JSON.stringify(safeUser)}));
            window.location.href = '/dashboard/reports';
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (err) {
    console.error('[linkedin-callback]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
