"use client";

import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import { useEffect } from "react";
import type { Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface SidebarTabberProps {
  latest: Post[];
  trending: Post[];
  videos: Post[];
}

function TabItem({ post }: { post: Post }) {
  if (!post.image) return null;
  return (
    <Link href={getPostPath(post)} rel="bookmark">
      <div className="mvp-feat1-list-cont left relative">
        <div className="mvp-feat1-list-out relative">
          <div className="mvp-feat1-list-img left relative">
            <PostImage
              src={post.image || ''}
              alt={post.title}
              width={120}
              height={72}
              className="mvp-reg-img"
            />
            <PostImage
              src={post.image || ''}
              alt={post.title}
              width={120}
              height={72}
              className="mvp-mob-img"
            />
          </div>
          <div className="mvp-feat1-list-in">
            <div className="mvp-feat1-list-text">
              <div className="mvp-cat-date-wrap left relative">
                <span className="mvp-cd-cat left relative">{post.category}</span>
                <span className="mvp-cd-date left relative">{post.timeAgo}</span>
              </div>
              <h2 className="post-heading-max-3-lines">{post.title}</h2>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SidebarTabber({ latest, trending, videos }: SidebarTabberProps) {
  useEffect(() => {
    const wrap = document.getElementById("sidebar-tabber-wrap");
    if (!wrap) return;
    const tabs = wrap.querySelectorAll("ul.mvp-feat1-list-buts li a");
    const contents = wrap.querySelectorAll(".mvp-tab-col-cont");
    const showTab = (index: number) => {
      tabs.forEach((t, i) => {
        (t.parentElement as HTMLElement)?.classList.toggle("active", i === index);
      });
      contents.forEach((c, i) => {
        (c as HTMLElement).style.display = i === index ? "block" : "none";
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        showTab(index);
      });
    });
    showTab(0);
  }, []);

  return (
    <div id="sidebar-tabber-wrap" className="mvp-widget-tab-wrap left relative">
      <div className="mvp-feat1-list-wrap left relative">
        <div className="mvp-feat1-list-head-wrap left relative">
          <ul className="mvp-feat1-list-buts left relative">
            <li className="mvp-feat-col-tab">
              <a href="#mvp-tab-col1">
                <span className="mvp-feat1-list-but">Latest</span>
              </a>
            </li>
            <li>
              <a href="#mvp-tab-col2">
                <span className="mvp-feat1-list-but">Trending</span>
              </a>
            </li>
            <li>
              <a href="#mvp-tab-col3">
                <span className="mvp-feat1-list-but">Videos</span>
              </a>
            </li>
          </ul>
        </div>
        <div id="mvp-tab-col1" className="mvp-feat1-list left relative mvp-tab-col-cont">
          {latest.filter((p) => p.image).map((post) => (
            <TabItem key={post.id} post={post} />
          ))}
        </div>
        <div id="mvp-tab-col2" className="mvp-feat1-list left relative mvp-tab-col-cont">
          {trending.filter((p) => p.image).map((post) => (
            <TabItem key={post.id} post={post} />
          ))}
        </div>
        <div id="mvp-tab-col3" className="mvp-feat1-list left relative mvp-tab-col-cont">
          {videos.filter((p) => p.image).map((post) => (
            <TabItem key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
