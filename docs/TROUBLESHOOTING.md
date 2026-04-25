# Troubleshooting

## 1. ChunkLoadError: Failed to load chunk /_next/static/chunks/….js (404)

**What it means:** The browser is asking for a JavaScript chunk file that no longer exists. This usually happens in **development** when:

- The dev server was restarted or the code was rebuilt
- Turbopack/Next.js generated new chunk names, but the browser tab still has references to old ones
- A hot reload left the page in an inconsistent state

**How to fix:**

1. **Hard refresh the page:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. If that doesn’t help, **clear the Next.js build and restart:**
   ```bash
   rm -rf .next
   npm run dev
   ```
3. Then open the app again (or hard refresh) so it loads the new chunks.

In **production**, this can happen after a new deploy if users keep an old tab open. They need to refresh to get the new assets.

---

## 2. Image 404: Failed to load resource (image:1 … 404)

**What it means:** The page is trying to show an image from a URL (e.g. a post thumbnail from S3 or the DB), but that URL returns **404 Not Found**. Common causes:

- The file was deleted from S3 (or never uploaded)
- The URL in the database is wrong (typo, old path, or wrong bucket/domain)
- The resource was moved or expired (e.g. external CDN)

**What the app does:** The `PostImage` component catches load errors and shows a **grey placeholder** so the layout doesn’t break. The 404 still appears in the browser’s Network/Console because the browser has already requested the image.

**How to fix:**

1. **Find which URLs 404:** In DevTools → Network, filter by “Img” or “All”, reload, and check which image requests are red (404). Note the URL.
2. **Fix or remove bad URLs in the DB:**  
   - If the file exists elsewhere, update `featured_image_url` / `featured_image_small_url` in the `posts` table.  
   - If the image is gone, you can set those columns to `NULL` and the post will be treated as “no thumbnail” (draft in RSS, hidden from listings that require thumbnails).
3. **Optional – list posts with missing/broken images:**  
   You can run or extend `scripts/check-posts-without-thumbnail.ts` to list posts with empty or invalid image URLs and then fix them in the DB or re-upload to S3.

You can’t fully “hide” the 404 in the console as long as the page requests that URL; fixing or clearing the URL in the DB is the proper fix.
