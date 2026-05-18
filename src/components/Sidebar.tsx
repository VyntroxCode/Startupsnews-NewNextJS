import { getTrendingPosts, getFeat1ListPosts, getVideoPosts } from "@/lib/data-adapter";
import { SidebarTabber } from "@/components/SidebarTabber";
import Link from "next/link";

const SIDEBAR_CATEGORIES = [
  { label: "AI & Deeptech", href: "/ai-deeptech" },
  { label: "Business", href: "/business" },
  { label: "eCommerce", href: "/ecommerce" },
  { label: "EV & Mobility", href: "/ev-mobility" },
  { label: "Fintech", href: "/fintech" },
  { label: "Funding", href: "/funding" },
  { label: "Gaming", href: "/gaming" },
  { label: "Healthtech", href: "/healthtech" },
  { label: "Robotics", href: "/robotics" },
  { label: "SaaS & Enterprise", href: "/saas-enterprise" },
  { label: "Social Media", href: "/social-media" },
  { label: "Tech", href: "/tech" },
  { label: "Web3 & Blockchain", href: "/web3-blockchain" },
  { label: "Press Release", href: "/press-release" },
];

interface SidebarProps {
  excludeIds?: string[];
}

/** Theme sidebar: Tabber (Latest, Trending, Videos) + optional ad. Used on single post, news, category, search. */
export async function Sidebar({ excludeIds = [] }: SidebarProps) {
  const latest = (await getFeat1ListPosts(excludeIds)).slice(0, 10);
  const trending = await getTrendingPosts();
  const videoPosts = await getVideoPosts(10);
  const videos = videoPosts.length > 0 ? videoPosts : (await getFeat1ListPosts(excludeIds)).slice(0, 6);

  return (
    <>
      <section className="mvp-side-widget">
        <SidebarTabber latest={latest} trending={trending} videos={videos} />
      </section>
    </>
  );
}
