import nodemailer from 'nodemailer';
import { queryOne } from '@/shared/database/connection';

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

/** Transporter for morning signal + manual newsletter sends: DB admin overrides > NEWSLETTER EMAIL CONFIG env vars > legacy SMTP_* env vars. */
export async function buildNewsletterTransporter() {
  const host   = await getSetting('nl_smtp_host')   || process.env.SMTP_PROVIDER || process.env.SMTP_HOST   || '';
  const port   = await getSetting('nl_smtp_port')   || process.env.SMTP_PORT     || '465';
  const secure = await getSetting('nl_smtp_secure') || process.env.SMTP_SECURE   || 'true';
  const user   = await getSetting('nl_smtp_user')   || process.env.EMAIL        || process.env.SMTP_USER   || '';
  const pass   = await getSetting('nl_smtp_pass')   || process.env.PASSWORD     || process.env.SMTP_PASS   || '';

  if (!host || !user || !pass) throw new Error('SMTP not configured. Set up mail config first.');

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: secure.toString().toLowerCase() === 'true',
    auth: { user, pass },
  });
}

export async function getNewsletterFrom(): Promise<string> {
  const dbFrom = await getSetting('nl_smtp_from');
  if (dbFrom) return dbFrom;

  const email = process.env.EMAIL || process.env.SMTP_USER || '';
  const senderName = process.env.SMTP_SENDER_NAME;
  if (email && senderName) return `"${senderName}" <${email}>`;
  if (email) return email;
  return process.env.SMTP_FROM || '';
}
