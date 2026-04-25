"use client";

import { useEffect } from "react";

export function Feat1Tabs() {
  useEffect(() => {
    const tabs = document.querySelectorAll(".mvp-feat1-list-buts li a");
    const contents = document.querySelectorAll(".mvp-tab-col-cont");

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

  return null;
}
