'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import PageTopbar from './PageTopbar';
import { noteCls, tagCls } from './ui';

const QUICK = [
  { label: '📊 Weekly Report (Excel)', prompt: "Get me last week's fintech funding in India as Excel" },
  { label: '🖼️ Infographic', prompt: "Make an infographic of this month's top 5 sectors" },
  { label: '📽️ PPT Summary', prompt: 'Build a PPT Summary of Q3 funding trends' },
  { label: '📄 PDF Report', prompt: 'PDF report on AI sector funding this year' },
];

interface Msg {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

/**
 * /dashboard/funding/ai — the preview's AI Assistant screen. The assistant is not built yet (it needs
 * a server-side LLM + search pipeline and a document generator), so instead of the preview's scripted
 * "sources agree" walkthrough it answers honestly and points to where the data already is.
 */
export default function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const nextId = useRef(1);

  const ask = (text: string) => {
    const prompt = text.trim();
    if (!prompt) return;
    setMessages((m) => [
      ...m,
      { id: nextId.current++, role: 'user', text: prompt },
      {
        id: nextId.current++,
        role: 'bot',
        text: "The AI Assistant isn't live yet, so I can't build that report for you. Meanwhile: All Deals lets you filter by sector, country and dates and download the result as Excel, and the Dashboard and Market Analysis pages show the same data as charts.",
      },
    ]);
    setInput('');
  };

  return (
    <div>
      <PageTopbar
        title="AI Assistant"
        sub="Ask for a report, an export, a chart — in your language, your format"
        right={<span className={tagCls}>Coming Soon</span>}
      />
      <div className="-mx-3 bg-linear-to-b from-fi-ai-light to-fi-bg to-[240px] px-3 pb-[70px] pt-[22px] sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <div className="mx-auto mt-5 max-w-[820px]">
          <div className="px-0 pb-2.5 pt-[30px] text-center">
            <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-linear-135 from-fi-ai to-fi-ai-dark text-white">
              <Sparkles size={24} aria-hidden />
            </div>
            <h2 className="m-0 mb-1.5 text-[26px] font-semibold text-fi-ink">What Do You Want To Know?</h2>
            <p className="mx-auto my-0 max-w-[520px] text-[13px] leading-[1.6] text-fi-ink-soft">
              Try: &ldquo;Get me last week&apos;s fintech funding in India as an Excel file&rdquo;. When it launches, the assistant will answer from the funding dataset and cite where every number came from.
            </p>
          </div>

          <div className={`${noteCls} mx-auto mb-4 max-w-[600px]`}>
            <span>⚠️</span>
            <div>
              <b className="text-[#6B4308]">Not live yet:</b> answers need a server-side AI + search pipeline and a document generator for Excel/PPT/PDF/image output. Until then, use{' '}
              <Link href="/dashboard/funding/deals" className="font-semibold text-fi-gold-ink underline visited:text-fi-gold-ink">All Deals</Link> for filtered Excel downloads.
            </div>
          </div>

          <div className="mb-[18px] flex flex-wrap justify-center gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => ask(q.prompt)}
                className="cursor-pointer rounded-[20px] border border-solid border-[#DCC9F5] bg-white px-3.5 py-2 text-[12px] font-semibold text-fi-ai-dark hover:bg-fi-ai-light"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex min-h-[200px] flex-col gap-3.5">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="max-w-[80%] self-end rounded-[14px] rounded-br-[4px] bg-fi-ink px-[15px] py-3 text-[13px] leading-[1.6] text-white">{m.text}</div>
              ) : (
                <div key={m.id} className="max-w-[80%] self-start rounded-[14px] rounded-bl-[4px] border border-solid border-fi-line bg-fi-surface px-[15px] py-3 text-[13px] leading-[1.6] text-fi-ink shadow-fi">
                  {m.text}
                </div>
              ),
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-end gap-2 rounded-[14px] border border-solid border-fi-line bg-fi-surface p-2 shadow-fi"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              placeholder="Ask for a report, a chart, an export…"
              aria-label="Ask the AI Assistant"
              className="box-border max-h-[120px] min-h-[22px] w-full resize-none border-0 bg-transparent px-2.5 py-2 text-[13.5px] text-fi-ink outline-none"
            />
            <button type="submit" className="cursor-pointer whitespace-nowrap rounded-[7px] border border-solid border-fi-ai bg-fi-ai px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-fi-ai-dark">
              Send
            </button>
          </form>
          <div className="flex gap-1.5 px-1 pb-1 pt-1.5">
            {['Excel', 'PPT', 'PDF', 'Image', 'Infographic'].map((t) => (
              <span key={t} className="rounded-md border border-solid border-fi-line px-[7px] py-0.5 text-[10.5px] font-semibold text-fi-ink-faint">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
