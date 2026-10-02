"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

import { Button } from "@/modules/content-studio/components/ui";
import { useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { useGenerate } from "@/modules/content-studio/lib/hooks/useGenerate";
import type { Article } from "@/modules/content-studio/types";

// ── TOPIC PANEL (content-studio-v17.html:532-542, 956-963) ──

const EXAMPLES = [
  { label: "EV in India", topic: "The future of electric vehicles in India" },
  {
    label: "Dropshipping 2025",
    topic: "How to start a profitable dropshipping business in 2025",
  },
  { label: "AI vs developers", topic: "Impact of AI on software developer jobs" },
  {
    label: "Budget phones",
    topic: "Best budget smartphones under ₹15000 in 2025",
  },
];

export function TopicPanel() {
  const dispatch = useSourceDispatch();
  const toast = useToast();
  const generate = useGenerate();
  const [topic, setTopic] = useState("");

  const run = () => {
    const t = topic.trim();
    if (!t) {
      toast("Please enter a topic first", "warning");
      return;
    }
    const article: Article = {
      title: t,
      link: "#",
      pubDate: new Date().toISOString(),
      desc: t,
      fullText: null,
      feedName: "Topic Brief",
      feedUrl: "",
      feedColor: "#e8186d",
      source: "topic",
      isTopicMode: true,
    };
    dispatch({ type: "selectArticle", article });
    void generate(article);
  };

  return (
    <div className="flex shrink-0 flex-col gap-2 px-3.5 py-3">
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={4}
        placeholder={
          'Describe your article topic...\n\ne.g. "The rise of AI in Indian agriculture"\n\nTip: You can also paste article text here as context.'
        }
        className="min-h-[82px] w-full resize-none rounded-cs-card border-[1.5px] border-cs-edge2 bg-cs-s2 px-[11px] py-[9px] font-cs-sans text-cs-ui leading-[1.6] text-cs-ink transition-all duration-150 outline-none focus:border-cs-accent focus:bg-cs-surface focus:shadow-[0_0_0_3px_rgba(232,24,109,.1)]"
      />

      <div className="flex flex-wrap gap-[5px]">
        <span className="w-full text-cs-meta text-cs-t3">Quick examples:</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => setTopic(e.topic)}
            className="cursor-pointer rounded-full border-[1.5px] border-cs-edge bg-cs-surface px-2.5 py-[3px] text-cs-meta font-medium text-cs-t2 transition-all duration-100 hover:border-cs-accent hover:bg-cs-abg hover:text-cs-accent"
          >
            {e.label}
          </button>
        ))}
      </div>

      <Button variant="primary" className="w-full justify-center" onClick={run}>
        <Zap aria-hidden className="size-3.5 shrink-0 fill-current" />
        Generate from topic
      </Button>
    </div>
  );
}
