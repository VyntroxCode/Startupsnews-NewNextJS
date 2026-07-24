import nodemailer from 'nodemailer';
import { queryOne } from '@/shared/database/connection';

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

/** Transporter for morning signal + manual newsletter sends: Resend's SMTP relay (smtp.resend.com), authenticated with RESEND_API_KEY. */
export async function buildNewsletterTransporter() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 587,
    secure: false,
    auth: { user: 'resend', pass: apiKey },
  });
}

/** Sender for morning signal + manual newsletter sends: DB admin override (Admin > Newsletter > Mail Config) > NL_SMTP_FROM env var. */
export async function getNewsletterFrom(): Promise<string> {
  const dbFrom = await getSetting('nl_smtp_from');
  if (dbFrom) return dbFrom;

  return process.env.NL_SMTP_FROM || '';
}
