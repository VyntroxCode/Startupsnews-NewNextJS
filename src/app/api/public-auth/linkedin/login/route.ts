import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
  if (!LINKEDIN_CLIENT_ID) {
    return new NextResponse('LinkedIn sign-in is not configured', { status: 503 });
  }
  const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.fyi';
  
  const redirectUri = `${NEXT_PUBLIC_SITE_URL}/api/public-auth/linkedin/callback`;
  const scope = 'openid profile email';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(authUrl);
}
