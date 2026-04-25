# 🚀 Quick Start: Deploy the Scraper in 5 Steps

**Estimated Time:** 30 minutes (+ scraping time)

---

## ✅ What's Already Done

```
✓ Scraper script created (scripts/scrape-startupnews-posts.ts)
✓ Implementation guide created (SCRAPER_IMPLEMENTATION_GUIDE.md)
✓ Cheerio dependencies installed
✓ npm script added (npm run scrape:startupnews)
✓ Database integration ready
✓ Image S3 upload ready
✓ Admin user verified
```

---

## 🎯 Step 1: Prepare Your Environment (5 minutes)

### 1.1 Start Services
```bash
cd /home/ubuntu/zox-nextjs
docker-compose up -d mariadb redis
```

### 1.2 Verify Database
```bash
npm run db:seed  # Create admin user and categories
```

### 1.3 Check Admin User
```bash
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT id, email, name, role FROM users WHERE role='admin';"
```

**Expected Output:**
```
id  email                     name        role
1   admin@startupnews.fyi    Admin User  admin
```

### 1.4 Create Missing Category (if needed)

If cybersecurity category is missing:
```bash
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "INSERT INTO categories (name, slug, status) 
      VALUES ('Cybersecurity', 'cybersecurity', 'active');"
```

---

## 🔍 Step 2: Analyze Website Structure (10 minutes)

### 2.1 Open Target Website
```
https://startupnews.thebackend.in/
```

### 2.2 Inspect HTML Structure

1. **Right-click** on any news article
2. Click **"Inspect"** (or press F12)
3. Look for the article container, like:
   ```html
   <article class="...">
     <h2>Article Title</h2>
     <p>Article summary...</p>
     <img src="...">
     <a href="/post/slug">Read More</a>
     <time datetime="2026-02-15">...</time>
   </article>
   ```

### 2.3 Note the Key Elements

Create a **notes file** with:
- Article container selector (e.g., `article.post` or `.news-item`)
- Title selector (e.g., `h2` or `.post-title`)
- Excerpt selector (e.g., `p` or `.excerpt`)
- Image selector (e.g., `img` or `.featured-img`)
- Link selector (e.g., `a` or `.post-link`)
- Date selector (e.g., `time` or `.date`)

**Example notes:**
```
Container: article.post-card
Title: h2.post-title
Excerpt: p.post-excerpt
Image: img.featured-image
Link: a.post-url
Date: time.post-date
```

---

## ✏️ Step 3: Implement Scraper Function (10 minutes)

### 3.1 Open Script
```bash
nano scripts/scrape-startupnews-posts.ts
```

### 3.2 Find the `scrapePosts()` Function

Search for (around line 350):
```typescript
/**
 * Scrape posts from the website
 */
async function scrapePosts(): Promise<ScrapedPost[]> {
```

### 3.3 Replace the Template

Replace the entire `scrapePosts()` function with this implementation:

```typescript
async function scrapePosts(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];
  
  try {
    logger.info('Starting scrape from', { url: SOURCE_URL });

    // Step 1: Fetch website HTML
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Step 2: Find all article containers
    // UPDATE THESE SELECTORS with your website's actual selectors!
    const articles = $('article.post-card');  // <-- CUSTOMIZE!

    logger.info('Found articles', { count: articles.length });

    // Step 3: Extract post details
    articles.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title (CUSTOMIZE SELECTOR)
        const title = $el.find('h2.post-title').text().trim();
        if (!title) return;

        // Extract excerpt (CUSTOMIZE SELECTOR)
        const excerpt = $el.find('p.post-excerpt').text().trim();
        if (!excerpt) return;

        // Extract link (CUSTOMIZE SELECTOR)
        let postUrl = $el.find('a.post-url').attr('href') || '';
        if (!postUrl) return;

        // Make absolute URL
        postUrl = postUrl.startsWith('http') 
          ? postUrl 
          : new URL(postUrl, SOURCE_URL).toString();

        // Extract image (CUSTOMIZE SELECTOR)
        let imageUrl = $el.find('img.featured-image').attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = new URL(imageUrl, SOURCE_URL).toString();
        }

        // Extract date (CUSTOMIZE SELECTOR)
        let publishedAt = new Date();
        const dateStr = $el.find('time.post-date').attr('datetime') ||
                       $el.find('time').text();
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        }

        // Filter by date (February onwards)
        const februaryStart = new Date(2026, 1, 1);
        if (publishedAt < februaryStart) {
          logger.warn('Skipping old post', { title: title.slice(0, 30) });
          return;
        }

        posts.push({
          title: title.slice(0, 255),
          slug: generateSlug(title),
          excerpt: excerpt.slice(0, 500),
          content: excerpt,  // You can enhance this by fetching detail page
          imageUrl,
          publishedAt,
          sourceUrl: postUrl,
          categories: [],
        });

        logger.info(`Extracted post [${index + 1}]`, { title: title.slice(0, 40) });
      } catch (err) {
        logger.warn('Error processing article', err);
      }
    });

    logger.success('Scraping completed', posts.length);
    return posts;

  } catch (err) {
    logger.error('Error scraping website', err);
    return [];
  }
}
```

### 3.4 Customize Selectors

Replace these with your actual selectors from Step 2.2:

```javascript
$('article.post-card')           // Your article container
$el.find('h2.post-title')         // Your title selector
$el.find('p.post-excerpt')        // Your excerpt selector
$el.find('a.post-url')            // Your link selector
$el.find('img.featured-image')    // Your image selector
$el.find('time.post-date')        // Your date selector
```

### 3.5 Save & Exit
```
Ctrl+X → Y → Enter
```

---

## 🧪 Step 4: Test the Scraper (5 minutes)

### 4.1 Run Test Scrape
```bash
npm run scrape:startupnews
```

### 4.2 Expected Output

```
[INFO] Starting StartupNews scraper {...}
[INFO] Database connected 
[INFO] Found admin user {email: "admin@startupnews.fyi", id: 1}
✓ Categories loaded (12)
[INFO] Scraping posts...
[INFO] Found articles {count: 342}
[INFO] Extracted post [1] {title: "Article Title..."}
[INFO] Extracted post [2] {title: "Another Article..."}
...
[INFO] Processing batch 1 of 7
[INFO] Image uploaded to S3 {...}
✓ Post created (42)
...
✓ Import Summary
[INFO] Posts imported {successful: 234, duplicates: 8, errors: 2}
✓ Scraper finished successfully
```

### 4.3 Verify in Database

If successful, check what was imported:

```bash
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT COUNT(*) FROM posts WHERE external_source_url LIKE 'https://startupnews%';"
```

Should return the number of imported posts.

---

## 🌐 Step 5: Verify on Website (5 minutes)

### 5.1 Check Admin Panel

```bash
# If running locally
http://localhost:3000/admin

# Login
Email: admin@startupnews.fyi
Password: Admin@123!

# Go to Posts
# Should see imported posts in the list
```

### 5.2 Check Frontend

```bash
http://localhost:3000

# Latest News section should show imported posts
# Check categories page for posts in correct category
```

### 5.3 Verify Images

Click on an imported post - images should load from S3 URL.

---

## 📊 Monitoring the Scraper

### Live Progress

```bash
# Watch with timestamps
npm run scrape:startupnews | grep -E "\\[|✓|Posts"
```

### Check Specific Metrics

```bash
# How many posts imported?
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT COUNT(*) as total FROM posts WHERE external_source_url LIKE 'https://startupnews%';"

# Import distribution by category
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT c.slug, COUNT(*) FROM posts p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.external_source_url LIKE 'https://startupnews%' 
      GROUP BY c.slug ORDER BY COUNT(*) DESC;"

# Most recent imports
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT id, title, published_at FROM posts 
      WHERE external_source_url LIKE 'https://startupnews%' 
      ORDER BY published_at DESC LIMIT 10;"
```

---

## 🔄 Running Again (For New Posts)

The scraper is safe to run multiple times:

```bash
# Run next week to import new posts
npm run scrape:startupnews

# Only NEW posts will be imported
# Duplicates will be skipped
# No manual cleaning needed
```

---

## ❌ If Something Goes Wrong

### Selectors Not Matching

1. Open website in browser
2. F12 → DevTools
3. Right-click article → Inspect
4. Copy correct selectors
5. Update script
6. Run again

### Database Issues

```bash
# Reset and reseed
npm run db:seed
npm run scrape:startupnews
```

### Image Upload Failed

```bash
# Check AWS credentials
aws s3 ls

# Test direct upload
aws s3 cp /tmp/test.jpg s3://startupnews-media-2026/
```

### Still No Posts

```bash
# Check scraper logs
DEBUG=*:* npm run scrape:startupnews | tail -50

# Check website is accessible
curl -I https://startupnews.thebackend.in/
```

---

## 📝 Complete Checklist

```
✓ Environment started (Docker, database)
✓ Admin user verified
✓ Categories loaded (12)
✓ Website structure analyzed
✓ Selectors identified
✓ scrapePosts() function implemented
✓ Selectors customized in script
✓ Test run successful
✓ Posts visible in database
✓ Posts visible in admin panel
✓ Images uploaded to S3
✓ Posts visible on frontend
✓ Duplicates not re-imported
```

---

## 🎯 Expected Results

After running the scraper, you should have:

| Metric | Expected |
|--------|----------|
| Posts imported | 200-500+ |
| Duplicates skipped | 0-50 |
| Images uploaded | ~95%+ success |
| Categories populated | All 12 |
| Source URLs tracked | 100% |
| Featured images | > 90% |

---

## 💡 Pro Tips

1. **Run on less busy time** - Evening or night to avoid server load
2. **Check logs first** - They tell you exactly what happened
3. **Test with small site first** - Run one page before full site
4. **Keep source URL** - It helps with verification and future updates
5. **Monitor images** - Ensure S3 upload working properly
6. **Database backups** - Take backup before running first time

---

## 📞 Need Help?

**Check these files first:**
- `SCRAPER_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide
- `SCRAPER_SUMMARY.md` - Complete summary and options
- `scripts/scrape-startupnews-posts.ts` - The script with inline comments

---

**That's it! You're ready to go! 🚀**

Once selectors are customized, run:
```bash
npm run scrape:startupnews
```

And your imported posts will be ready on the website instantly!
