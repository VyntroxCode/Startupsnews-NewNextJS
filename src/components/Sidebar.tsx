import { getTrendingPosts, getFeat1ListPosts, getVideoPosts } from "@/lib/data-adapter";
import { SidebarTabber } from "@/components/SidebarTabber";

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
      <section className="mvp-side-widget">
        <div className="mvp-widget-home-head">
          <h4 className="mvp-widget-home-title2">
            <span className="mvp-widget-home-title2">Advertisement</span>
          </h4>
        </div>
        <a
          href="https://www.hostinger.com/in?REFERRALCODE=JXNSTARTUPGK"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Hostinger"
          style={{ display: "block" }}
        >
          <img
            src="/images/ads/Hostinger_Ads.jpeg"
            alt="Hostinger advertisement"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </a>
      </section>
    </>
  );
}
