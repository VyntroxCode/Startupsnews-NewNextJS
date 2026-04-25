"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchOverlay() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    const q = (form?.querySelector('input[name="q"]') as HTMLInputElement)?.value?.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      document.getElementById("mvp-search-wrap")?.classList.remove("mvp-search-toggle");
    }
  };

  return (
    <div id="mvp-search-wrap">
      <div id="mvp-search-box">
        <form ref={formRef} method="get" id="searchform" action="/search" onSubmit={handleSubmit}>
          <input type="text" name="q" id="s" placeholder="Search" defaultValue="" />
          <input type="hidden" id="searchsubmit" value="Search" />
        </form>
      </div>
      <div className="mvp-search-but-wrap mvp-search-click">
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
