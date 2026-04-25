import mariadb from 'mariadb';

const pool = mariadb.createPool({
    host: 'localhost', port: 3306,
    user: 'zox_user', password: 'ZoxPr0d_S3cur3_2026', database: 'zox_db',
    connectionLimit: 2, connectTimeout: 5000,
});

async function run(sql, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const r = await conn.query(sql, params);
        return r;
    } finally {
        if (conn) conn.release();
    }
}

const today = '2026-02-26';

// 1. Fix HTML entities in titles
const events = await run('SELECT id, title FROM events WHERE title LIKE ? OR title LIKE ?', ['%&#039;%', '%&amp;%']);
for (const e of events) {
    const clean = e.title.replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    await run('UPDATE events SET title = ? WHERE id = ?', [clean, e.id]);
    console.log(`Fixed title: ${clean.substring(0, 60)}`);
}

// 2. Fix excerpts with HTML entities
const exs = await run('SELECT id, excerpt FROM events WHERE excerpt LIKE ? OR excerpt LIKE ?', ['%&#039;%', '%&amp;%']);
for (const e of exs) {
    if (!e.excerpt) continue;
    const clean = e.excerpt.replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    await run('UPDATE events SET excerpt = ? WHERE id = ?', [clean, e.id]);
}
console.log(`Fixed ${exs.length} excerpts`);

// 3. Fix future events marked as past → upcoming
const r1 = await run(`UPDATE events SET status = 'upcoming' WHERE event_date >= ? AND status = 'past'`, [today]);
console.log(`Fixed ${r1.affectedRows} future events: past → upcoming`);

// 4. Fix wrong locations
await run(`UPDATE events SET location = 'Ghana' WHERE location LIKE '%Innovation%Excellence%'`);
await run(`UPDATE events SET location = 'Hyderabad' WHERE location = 'Investors Founders'`);
await run(`UPDATE events SET location = 'Bengaluru' WHERE location = 'Craziest Startup Event'`);
await run(`UPDATE events SET location = 'Delhi NCR' WHERE location = 'New Delhi'`);
await run(`UPDATE events SET location = 'Delhi NCR' WHERE location = 'Noida'`);
await run(`UPDATE events SET location = 'Other Cities' WHERE location = 'Pune'`);
await run(`UPDATE events SET location = 'Other Cities' WHERE location = 'Kolkata'`);
await run(`UPDATE events SET location = 'Other Cities' WHERE location = 'Jaipur'`);
await run(`UPDATE events SET location = 'Other Cities' WHERE location LIKE 'Tiruchirap%'`);
await run(`UPDATE events SET location = 'Other Cities' WHERE location = 'Madhya Pradesh'`);
await run(`UPDATE events SET location = 'Cohort' WHERE location = 'Co-Hort'`);
console.log('Fixed locations');

// 5. Remove duplicate FoodTech Meetup (keep lowest id)
const ft = await run(`SELECT id FROM events WHERE title LIKE '%FoodTech Meetup%Noida%' ORDER BY id ASC`);
for (let i = 1; i < ft.length; i++) {
    await run('DELETE FROM events WHERE id = ?', [ft[i].id]);
    console.log(`Deleted dup FoodTech id=${ft[i].id}`);
}

// 6. Remove duplicate Unchained Summit (keep lowest id)
const uc = await run(`SELECT id FROM events WHERE title LIKE '%Unchained Summit%' ORDER BY id ASC`);
for (let i = 1; i < uc.length; i++) {
    await run('DELETE FROM events WHERE id = ?', [uc[i].id]);
    console.log(`Deleted dup Unchained Summit id=${uc[i].id}`);
}

// 7. Fix wrong event dates (events that got 2026-02-21 due to import bug)
const slugDateFixes = [
    ['asean-smart-energy-energy-storage-expo-2026-thailand-march-25-26', '2026-03-25'],
    ['asean-solar-pv-energy-storage-expo-2026-thailand-march-25-27', '2026-03-25'],
    ['emergetech-2026-residential-summit-jaipur-27th-february-1st-march-2026', '2026-02-27'],
    ['25th-connected-banking-summit-innovation-excellence-awards-ghana-25th-february-2026', '2026-02-25'],
    ['3rd-fintech-week-expo-2026-amsterdam-26-27-february', '2026-02-26'],
];
for (const [slug, date] of slugDateFixes) {
    const r = await run('UPDATE events SET event_date = ? WHERE slug = ?', [date, slug]);
    if (r.affectedRows > 0) console.log(`Fixed date: ${slug} → ${date}`);
}

// 8. Now fix past status again (for ones we just fixed dates)
const r2 = await run(`UPDATE events SET status = 'upcoming' WHERE event_date >= ? AND status = 'past'`, [today]);
console.log(`Fixed ${r2.affectedRows} more future events after date fix`);

// 9. Summary
const pub = await run(`SELECT COUNT(*) as cnt FROM events WHERE event_date >= ? AND status IN ('upcoming','ongoing')`, [today]);
console.log(`\nPublic visible events: ${pub[0].cnt}`);
const byLoc = await run(`SELECT location, COUNT(*) as cnt FROM events WHERE event_date >= ? AND status IN ('upcoming','ongoing') GROUP BY location ORDER BY cnt DESC`, [today]);
for (const r of byLoc) console.log(`  ${r.location}: ${r.cnt}`);

await pool.end();
console.log('\nDone!');
