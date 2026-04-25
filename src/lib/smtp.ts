import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required SMTP environment variable: ${name}`);
  }
  return value;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = getRequiredEnv('SMTP_HOST');
  const port = Number(getRequiredEnv('SMTP_PORT'));
  const secure = (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
  const user = getRequiredEnv('SMTP_USER');
  const pass = getRequiredEnv('SMTP_PASS');

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendSmtpMail(payload: MailPayload) {
  const from = getRequiredEnv('SMTP_FROM');
  const mailer = getTransporter();

  return mailer.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo,
  });
}