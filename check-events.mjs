import mariadb from 'mariadb';

const pool = mariadb.createPool({
    host: 'localhost', port: 3306,
    user: 'zox_user', password: 'ZoxPr0d_S3cur3_2026', database: 'zox_db',
    connectionLimit: 2,
});

const conn = await pool.getConnection();

// 1. All events by date
console.log('\n=== ALL EVENTS ===');
const all = await conn.query('SELECT id, title, location, event_date, status FROM events ORDER BY event_date ASC, id ASC');
for (const e of all) {
    console.log(`[${e.id}] [${String(e.event_date).substring(0, 10)}] [${e.status}] [${e.location}] ${e.title.substring(0, 60)}`);
}

// 2. Status breakdown
console.log('\n=== STATUS BREAKDOWN ===');
const statuses = await conn.query('SELECT status, COUNT(*) as cnt FROM events GROUP BY status');
for (const s of statuses) console.log(`  ${s.status}: ${s.cnt}`);

// 3. Events that would show on public page (upcoming/ongoing, date >= today)
const today = new Date().toISOString().split('T')[0];
console.log(`\n=== PUBLIC VISIBLE (event_date >= ${today} AND status IN upcoming/ongoing) ===`);
const pub = await conn.query(`SELECT id, title, location, event_date, status FROM events WHERE event_date >= ? AND status IN ('upcoming','ongoing') ORDER BY event_date ASC`, [today]);
console.log(`  Count: ${pub.length}`);
for (const e of pub) {
    console.log(`  [${e.id}] [${String(e.event_date).substring(0, 10)}] [${e.location}] ${e.title.substring(0, 55)}`);
}

// 4. Future events NOT showing (wrong status)
console.log(`\n=== FUTURE EVENTS WITH WRONG STATUS (hidden from public) ===`);
const hidden = await conn.query(`SELECT id, title, location, event_date, status FROM events WHERE event_date >= ? AND status NOT IN ('upcoming','ongoing') ORDER BY event_date ASC`, [today]);
for (const e of hidden) {
    console.log(`  [${e.id}] [${String(e.event_date).substring(0, 10)}] [${e.status}] ${e.title.substring(0, 55)}`);
}

// 5. Duplicates by title
console.log('\n=== DUPLICATE TITLES ===');
const dups = await conn.query(`SELECT title, COUNT(*) as cnt FROM events GROUP BY title HAVING COUNT(*) > 1`);
for (const d of dups) console.log(`  [${d.cnt}x] ${d.title.substring(0, 60)}`);

conn.release();
await pool.end();
