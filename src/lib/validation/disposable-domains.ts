/** Common disposable/temporary email domains — rejected outright on the dossier form since a
 * throwaway address can't receive grant-status updates. Free-mail domains (gmail, etc.) are
 * NOT in this list — those are allowed, just nudged toward a work email client-side. */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net",
  "throwawaymail.com", "yopmail.com", "yopmail.net", "getnada.com", "trashmail.com",
  "sharklasers.com", "dispostable.com", "fakeinbox.com", "mailnesia.com", "mintemail.com",
  "mytemp.email", "moakt.com", "tempinbox.com", "emailondeck.com", "maildrop.cc",
  "spamgourmet.com", "mailcatch.com", "mail-temporaire.fr", "discard.email", "mohmal.com",
  "tempr.email", "burnermail.io", "temp-mail.io", "tempmailo.com", "1secmail.com",
  "harakirimail.com", "spam4.me", "emailfake.com", "fakemailgenerator.com", "inboxbear.com",
]);

export function isDisposableEmailDomain(domain: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
}
