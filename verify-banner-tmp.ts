import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { PartnershipEventsRepository } from './src/modules/partnership-events/repository/partnership-events.repository';
import { PartnershipEventsService } from './src/modules/partnership-events/service/partnership-events.service';
import { EventsService } from './src/modules/events/service/events.service';
import { EventsRepository } from './src/modules/events/repository/events.repository';
import { BannersRepository } from './src/modules/banners/repository/banners.repository';
import { BannersService } from './src/modules/banners/service/banners.service';
import { query, closeDbConnection } from './src/shared/database/connection';

const repo = new PartnershipEventsRepository();
const svc = new PartnershipEventsService(repo, new EventsService(new EventsRepository()));
const bannersRepo = new BannersRepository();
const bannersSvc = new BannersService(bannersRepo);
const IMG = 'https://example.com/zz-test-banner.jpg';
const NAME = '__ZZ Banner Schedule Test ' + process.pid;
let ptId: number | null = null;
let bannerId: number | null = null;

async function main() {
  const a = await svc.createEvent({
    eventName: NAME, city: 'Mumbai', country: 'India',
    eventStartDate: '2027-03-10', eventEndDate: '2027-03-12',
    partnershipStatus: 'Initiated', source: 'verify-script',
  }, 'verify-script');
  ptId = a.entity.id;
  console.log('1. created pt row', ptId, '| banner_id =', a.entity.banner_id);

  const b = await svc.updateEvent(ptId, { bannerUrl: IMG, bannerStartDate: '2027-02-01' }, 'verify-script');
  const e2 = (await repo.findById(ptId))!;
  bannerId = e2.banner_id;
  console.log('2. after adding banner -> banner_id =', bannerId, '| warning =', b?.warning);
  const row = await bannersRepo.findById(bannerId!);
  console.log('   banners row:', { title: row!.title, link: row!.link_url, start: String(row!.start_date), end: String(row!.end_date), active: row!.is_active, order: row!.display_order });

  const activeNow = await bannersSvc.getActiveBanners();
  console.log('3. visible on homepage today?', activeNow.some((x) => x.id === bannerId) ? 'YES (BUG)' : 'no - correctly hidden until 2027-02-01');

  await query('UPDATE banners SET start_date = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id = ?', [bannerId]);
  const { deleteCacheByPrefix } = await import('./src/shared/cache/redis.client');
  await deleteCacheByPrefix('banners:');
  const activeThen = await bannersSvc.getActiveBanners();
  console.log('4. once the start date has passed:', activeThen.some((x) => x.id === bannerId) ? 'shows on homepage OK' : 'STILL HIDDEN (BUG)');

  await svc.updateEvent(ptId, { comment: 'resave', bannerUrl: IMG, bannerStartDate: '2027-02-01' }, 'verify-script');
  const dupes = await query<{ c: number | bigint }>('SELECT COUNT(*) c FROM banners WHERE image_url = ?', [IMG]);
  console.log('5. banner rows after re-save:', Number(dupes[0].c), Number(dupes[0].c) === 1 ? 'OK no duplicate' : 'DUPLICATED');

  await svc.updateEvent(ptId, { bannerUrl: '', bannerStartDate: '' }, 'verify-script');
  const cleared = await bannersRepo.findById(bannerId!);
  console.log('6. after clearing image -> row still exists:', !!cleared, '| is_active =', cleared!.is_active);

  await query('UPDATE banners SET is_active = 1 WHERE id = ?', [bannerId]);
  await repo.update(ptId, { bannerUrl: IMG, bannerStartDate: '2027-02-01' });
  await svc.deleteEvent(ptId);
  const afterDelete = await bannersRepo.findById(bannerId!);
  console.log('7. after deleting tracker record -> banner is_active =', afterDelete!.is_active);
  ptId = null;
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
  .finally(async () => {
    if (ptId) await query('DELETE FROM partnership_events WHERE id = ?', [ptId]);
    if (bannerId) await query('DELETE FROM banners WHERE id = ?', [bannerId]);
    const left = await query('SELECT id FROM partnership_events WHERE event_name = ?', [NAME]);
    const bLeft = await query('SELECT id FROM banners WHERE image_url = ?', [IMG]);
    console.log('cleanup: leftover pt rows =', (left as unknown[]).length, '| leftover banner rows =', (bLeft as unknown[]).length);
    await closeDbConnection();
  });
