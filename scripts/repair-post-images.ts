
import { query } from '../src/shared/database/connection';
import { uploadImageToS3, downloadImage, s3KeyForRssImage } from '../src/modules/rss-feeds/utils/image-to-s3';

async function repairPostImages() {
    console.log('Starting post image repair...');

    try {
        // Get all posts with no featured image OR with an SVG featured image
        const posts = await query<any>(
            `SELECT id, title, content FROM posts 
       WHERE (featured_image_url IS NULL OR featured_image_url = '' OR featured_image_url LIKE '%.svg') 
       AND status = 'published'
       ORDER BY id DESC`
        );

        console.log(`Found ${posts.length} posts to process.`);

        for (const post of posts) {
            if (!post.content) continue;

            let src = '';

            // 1. Try to find first VALID image in content
            const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
            let match;
            while ((match = imgRegex.exec(post.content)) !== null) {
                const candidate = match[1];
                if (candidate.match(/\.svg/i) || candidate.startsWith('data:') || candidate.includes('icon') || candidate.includes('cta-redirect')) {
                    continue;
                }
                src = candidate;
                break;
            }

            // 2. If no valid image in content, try to find Source Link and fetch og:image
            if (!src) {
                // Look for "Source link" or similar pattern at the end
                const linkMatch = post.content.match(/<a [^>]*href=["']([^"']+)["'][^>]*>Source link<\/a>/i);
                const sourceUrl = linkMatch ? linkMatch[1] : null;

                if (sourceUrl) {
                    console.log(`  No content image for ${post.id}. Fetching source: ${sourceUrl}`);
                    try {
                        const res = await fetch(sourceUrl, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
                            signal: AbortSignal.timeout(10000)
                        });
                        if (res.ok) {
                            const html = await res.text();
                            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
                            if (ogMatch && ogMatch[1]) {
                                src = ogMatch[1];
                                console.log(`  Found og:image: ${src}`);
                            }
                        }
                    } catch (err) {
                        console.log(`  Failed to fetch source: ${err}`);
                    }
                }
            }

            if (src) {
                // Try download
                const buf = await downloadImage(src);
                if (buf) {
                    // Try upload
                    try {
                        const s3Url = await uploadImageToS3(s3KeyForRssImage(post.id, src), buf, 'image/jpeg');
                        console.log(`Uploaded for ${post.id}: ${s3Url}`);
                        await query('UPDATE posts SET featured_image_url = ? WHERE id = ?', [s3Url, post.id]);
                    } catch (e) {
                        console.error(`  Upload failed for ${post.id}:`, e);
                    }
                } else {
                    console.log(`  Download failed for ${src}`);
                }
            }
        }
        console.log('Done.');

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        process.exit();
    }
}

repairPostImages();
