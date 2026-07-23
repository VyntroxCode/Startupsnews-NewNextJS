import { query, queryOne } from '@/shared/database/connection';

interface Args { email: string; categories: string; name?: string; }

function parseArgs(): Args {
  const email = process.argv[2]?.trim().toLowerCase();
  const categories = process.argv[3]?.trim();
  const name = process.argv[4]?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: tsx scripts/insert-newsletter-subscriber.ts <email> <comma,separated,slugs> [name]');
  }
  if (!categories) {
    throw new Error('Categories are required (comma-separated slugs), e.g. ai-deeptech,ecommerce,ev-mobility');
  }
  return { email, categories, name };
}

async function main() {
  const { email, categories, name } = parseArgs();
  const displayName = name || email.split('@')[0];

  const existing = await queryOne<{ id: number; newsletter_category_slugs: string | null }>(
    'SELECT id, newsletter_category_slugs FROM public_registrations WHERE email = ? LIMIT 1',
    [email]
  );

  if (existing) {
    await query(
      'UPDATE public_registrations SET newsletter_category_slugs = ?, is_active = 1, newsletter_unsubscribed = 0 WHERE id = ?',
      [categories, existing.id]
    );
    console.log(`Updated existing subscriber id=${existing.id} (${email}) -> categories: ${categories}`);
  } else {
    await query(
      'INSERT INTO public_registrations (name, email, auth_provider, newsletter_category_slugs, is_active) VALUES (?, ?, ?, ?, 1)',
      [displayName, email, 'email', categories]
    );
    console.log(`Inserted new subscriber (${email}) -> categories: ${categories}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
