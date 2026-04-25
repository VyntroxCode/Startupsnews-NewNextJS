# Why post images are not showing (403)

## What we checked

1. **DB** – Posts have S3 image URLs stored (e.g. `https://s3.amazonaws.com/startupnews-media-2026/uploads/2025/01/xxx.jpg` or with prefix `.../startupnews-in/uploads/...`).
2. **App** – `resolvePostImageUrl()` normalizes path-style to virtual-hosted and **prepends `S3_UPLOAD_PREFIX`** when the path is `uploads/...` (so DB URLs without the prefix still resolve to the correct key). `onlyS3ImageUrl()` keeps only our bucket URLs; Next.js `remotePatterns` allow the S3 host.
3. **Actual request** – Direct GET to the bucket URL (with or without prefix) still returns **HTTP/1.1 403 Forbidden** in some environments.

So the **upload and link flow are correct**; if images still don’t show, S3 is returning 403 (bucket/objects not public, or another policy denying access).

## Fix: allow public read on the bucket

Make the bucket (or the `uploads/*` prefix) publicly readable so the site and Next.js Image can load them.

1. In **AWS Console** → **S3** → bucket **startupnews-media-2026** → **Permissions**.
2. Under **Block public access**, ensure you allow public access for this bucket (edit and uncheck “Block all public access” if you want public read, or use a bucket policy that overrides for specific keys).
3. Add a **Bucket policy** that allows public `GetObject` for your images, for example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::startupnews-media-2026/uploads/*"
    }
  ]
}
```

To make the whole bucket public read (not only `uploads/`):

```json
"Resource": "arn:aws:s3:::startupnews-media-2026/*"
```

4. Save. After that, the same image URL should return **200** and the images will show on the site.

## If the bucket policy already allows public read but you still get 403

- **Object path** – Sync uploads to keys like `startupnews-in/uploads/...`. The app rewrites DB URLs that have path `uploads/...` to `startupnews-in/uploads/...` when `S3_UPLOAD_PREFIX=startupnews-in` is set in `.env.local`. Ensure that env is set so links match the keys in S3.
- **Block public access** – In S3 → Bucket → Permissions, ensure “Block all public access” is **Off** and the bucket policy is saved. If you use **bucket settings** that override the policy (e.g. at the organization level), those can still cause 403.
- **Object ownership** – Prefer “Bucket owner enforced” so only the bucket policy applies (no ACLs). If you use ACLs, the object may need `public-read` ACL.
- **Test in browser** – Open the image URL in an incognito window (no auth). If it loads there, the app should show it too.

## Use presigned URLs (bucket stays private)

If the bucket is **not** public, the app can generate **presigned** image URLs so featured/thumbnail images still load.

- **Presigning is on by default** when `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set (same as for sync). No extra env var is required.
- **Production:** Ensure the **same AWS env vars** are set in your deployment (e.g. Vercel/Railway env, Docker env, or `.env.production`). If they’re missing, the server can’t generate presigned URLs and images will 403 → placeholder.
- To **disable** presigning (e.g. after making the bucket public), set `S3_USE_PRESIGNED_URLS=false`.
- Optional: `S3_PRESIGNED_EXPIRES_SECONDS=3600` (default 1 hour; max 24 hours).

**Note:** Only the **featured/thumbnail** image is presigned. Images **inside post content** (HTML) are still the permanent S3 URLs; for those to work without making the bucket public you’d need either public access or a separate step to rewrite content URLs to presigned ones.

## Optional: CloudFront

If you prefer not to make the bucket public, put **CloudFront** in front of S3 (Origin Access Identity or OAC) and use the CloudFront URL as `NEXT_PUBLIC_IMAGE_BASE_URL` and in `next.config.ts` images `remotePatterns`. Then only CloudFront (and your app) can access the bucket.
