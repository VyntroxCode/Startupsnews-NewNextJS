import { getPostsByCategory } from "./src/lib/data-adapter";

async function main() {
  console.log("Checking AI Deeptech...");
  const aiPosts = await getPostsByCategory("ai-deeptech", 6);
  console.log(`AI Deeptech posts: ${aiPosts.length}`);
  if (aiPosts.length > 0) console.log(`First: ${aiPosts[0].title}`);

  console.log("\nChecking EV Mobility...");
  const evPosts = await getPostsByCategory("ev-mobility", 6);
  console.log(`EV Mobility posts: ${evPosts.length}`);
  if (evPosts.length > 0) console.log(`First: ${evPosts[0].title}`);

  console.log("\nChecking Fintech...");
  const finPosts = await getPostsByCategory("fintech", 6);
  console.log(`Fintech posts: ${finPosts.length}`);

  console.log("\nChecking Social Media...");
  const socPosts = await getPostsByCategory("social-media", 6);
  console.log(`Social Media posts: ${socPosts.length}`);
}

main().catch(console.error);
