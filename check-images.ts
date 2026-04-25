import { getPostsByCategory } from "./src/lib/data-adapter";

async function main() {
  const cats = ["ai-deeptech", "ev-mobility", "fintech", "social-media"];
  for (const c of cats) {
    const posts = await getPostsByCategory(c, 10);
    console.log(`${c}: ${posts.length} posts with images.`);
    if (posts.length > 0) console.log(`  First: ${posts[0].title}`);
  }
}
main();
