'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import { Extension } from '@tiptap/core';
import { normalizeEditorHtml } from '@/shared/utils/editor-html';
import { getAdminToken } from '@/lib/admin-auth';

/* ─── HTML sanitizer + structural converter for paste/upload ───
   1. Strips dangerous content (scripts, event handlers)
   2. Uses DOMParser to convert <div>/<section>/etc. into proper
      block elements TipTap understands, so card/grid layouts from
      tools like Content Studio don't collapse into a single line.
   3. CSS grid/card patterns (e.g. backlinks: multiple <a> siblings
      inside one <div>) get split into individual paragraphs.       ─── */
function sanitizeHtmlForPaste(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let html = bodyMatch ? bodyMatch[1] : raw;

  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
    .trim();

  if (typeof window === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Convert special semantic sections to TipTap-native equivalents
  // MUST run before attribute stripping (while class names are still present)

  // Callout / stat boxes → blockquote; class is transferred so injected CSS still targets it
  doc.body.querySelectorAll('[class*="callout"],[class*="data-box"],[class*="stat-box"],[class*="highlight-box"]').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    const bq = doc.createElement('blockquote');
    if ((el as HTMLElement).className) bq.className = (el as HTMLElement).className;
    while (el.firstChild) bq.appendChild(el.firstChild);
    parent.replaceChild(bq, el);
  });

  // Key-takeaways / summary boxes → blockquote; class transferred, preserves inner <ul>
  doc.body.querySelectorAll('[class*="key-takeaway"],[class*="takeaway"],[class*="summary-box"]').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    const bq = doc.createElement('blockquote');
    if ((el as HTMLElement).className) bq.className = (el as HTMLElement).className;
    while (el.firstChild) bq.appendChild(el.firstChild);
    parent.replaceChild(bq, el);
  });

  // <cite> inside blockquotes → <p><em>…</em></p> so TipTap can render it cleanly
  doc.body.querySelectorAll('blockquote cite').forEach((cite) => {
    const parent = cite.parentNode;
    if (!parent) return;
    const p = doc.createElement('p');
    const em = doc.createElement('em');
    while (cite.firstChild) em.appendChild(cite.firstChild);
    p.appendChild(em);
    parent.insertBefore(p, cite);
    parent.removeChild(cite);
  });

  // Strip junk attributes — keep only what TipTap cares about.
  // 'class' is preserved on semantic block/inline elements so that injected
  // CSS (e.g. from Content Studio's <style>) can still target them by class name.
  const KEEP_ATTRS: Record<string, Set<string>> = {
    A:          new Set(['href', 'title', 'class']),
    IMG:        new Set(['src', 'alt', 'title', 'width', 'height']),
    TD:         new Set(['colspan', 'rowspan']),
    TH:         new Set(['colspan', 'rowspan']),
    P:          new Set(['class']),
    H1:         new Set(['class']),
    H2:         new Set(['class']),
    H3:         new Set(['class']),
    H4:         new Set(['class']),
    H5:         new Set(['class']),
    H6:         new Set(['class']),
    BLOCKQUOTE: new Set(['class']),
    UL:         new Set(['class']),
    OL:         new Set(['class']),
    LI:         new Set(['class']),
  };
  doc.body.querySelectorAll('*').forEach((el) => {
    const allowed = KEEP_ATTRS[el.tagName] ?? new Set<string>();
    Array.from(el.attributes)
      .map(a => a.name)
      .filter(name => !allowed.has(name))
      .forEach(name => el.removeAttribute(name));
  });

  // Layout tags TipTap / ProseMirror treats as unknown blocks — must convert or unwrap
  const LAYOUT_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'HEADER', 'FOOTER', 'FIGURE', 'FIGCAPTION', 'NAV']);
  // Tags that ARE real block nodes in TipTap's schema
  const TIPTAP_BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);

  function convertLayoutNode(el: Element) {
    // Recurse children first so inner divs are resolved before outer ones
    Array.from(el.children).forEach(convertLayoutNode);

    if (!LAYOUT_TAGS.has(el.tagName)) return;

    const parent = el.parentNode;
    if (!parent) return;

    // If any direct child is already a TipTap block node → just unwrap
    const hasBlockChild = Array.from(el.childNodes).some(
      n => n.nodeType === Node.ELEMENT_NODE && TIPTAP_BLOCK.has((n as Element).tagName)
    );

    if (hasBlockChild) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    // Leaf layout element — get significant (non-blank) children
    const sigChildren = Array.from(el.childNodes).filter(
      n => !(n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() ?? '') === '')
    );

    // CSS grid / card pattern: all significant children are the SAME element tag
    const allSameElementTag =
      sigChildren.length > 1 &&
      sigChildren.every(n => n.nodeType === Node.ELEMENT_NODE) &&
      new Set(sigChildren.map(n => (n as Element).tagName)).size === 1;

    if (allSameElementTag) {
      const firstTag = (sigChildren[0] as Element).tagName;
      if (firstTag === 'A') {
        // Link grid (e.g. backlink tiles) → bullet list so each link is on its own line
        const ul = doc.createElement('ul');
        for (const child of sigChildren) {
          const li = doc.createElement('li');
          li.appendChild(child as ChildNode);
          ul.appendChild(li);
        }
        parent.insertBefore(ul, el);
      } else {
        // Other same-tag grid → each child in its own <p>
        for (const child of sigChildren) {
          const p = doc.createElement('p');
          p.appendChild(child as ChildNode);
          parent.insertBefore(p, el);
        }
      }
      parent.removeChild(el);
    } else {
      // Mixed inline content (e.g. <strong>Source:</strong> <a>…</a>) → one <p>
      // Transfer the original class so CSS can still target it (e.g. .source-footer)
      const p = doc.createElement('p');
      if ((el as HTMLElement).className) p.className = (el as HTMLElement).className;
      while (el.firstChild) p.appendChild(el.firstChild);
      parent.replaceChild(p, el);
    }
  }

  convertLayoutNode(doc.body);
  return doc.body.innerHTML;
}

/* ─── CSS extractor: pulls class-based rules from a Content Studio <style> block,
   scopes them to the editor container so they don't leak to the rest of the page.
   Element-only selectors (h1, p, blockquote …) are intentionally skipped — we let
   TipTap's own typographic CSS handle those; only class selectors are injected so
   that .data-callout, .deck, .faq-q, .key-takeaways etc. render as intended.    ─── */
function extractContentCss(raw: string): string {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return '';
  const css = styleMatch[1].replace(/\/\*[\s\S]*?\*\//g, '');
  // Scope to both the editor and the article page content wrapper
  const scopes = ['.tiptap-editor .ProseMirror', '.mvp-post-content-body'];
  const result: string[] = [];
  const ruleRe = /([^{}@]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css)) !== null) {
    const selectors = m[1].trim().split(',').map(s => s.trim()).filter(Boolean);
    if (selectors.length > 0 && selectors.every(s => s.includes('.'))) {
      // Normalize declarations: scale down px font-sizes and large px spacing
      // so they fit the article page's base font (1.1rem ~17.6px) instead of
      // the source HTML's body font (17px). Also cap oversized margins/paddings.
      const decls = m[2].trim()
        .split(';')
        .map(d => d.trim())
        .filter(Boolean)
        .map(d => {
          const [prop, ...rest] = d.split(':');
          if (!prop || !rest.length) return d;
          const propName = prop.trim().toLowerCase();
          const val = rest.join(':').trim();
          // Convert absolute px font-sizes to rem (base 16px)
          if (propName === 'font-size') {
            const px = parseFloat(val);
            if (!isNaN(px) && val.endsWith('px')) {
              return `${propName}: ${(px / 16).toFixed(3)}rem`;
            }
          }
          // Cap large px margins/paddings to reasonable values
          if (['margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
               'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'].includes(propName)) {
            // Replace each px value in shorthand, capping at 24px
            return `${propName}: ${val.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => {
              const num = parseFloat(n);
              return `${Math.min(num, 24)}px`;
            })}`;
          }
          return d;
        })
        .join('; ');
      const scoped = scopes.flatMap(scope =>
        selectors.map(s => `${scope} ${s}`)
      ).join(', ');
      result.push(`${scoped} { ${decls} }`);
    }
  }
  return result.join('\n');
}

/* ─── Custom Indent Extension ─── */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customIndent: { indent: () => ReturnType; outdent: () => ReturnType };
  }
}
const INDENT_TYPES = ['paragraph', 'heading', 'blockquote'] as const;
const MAX_INDENT = 7;

const IndentExtension = Extension.create({
  name: 'customIndent',
  addGlobalAttributes() {
    return [{
      types: INDENT_TYPES as unknown as string[],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el) => parseInt(el.getAttribute('data-indent') || '0') || 0,
          renderHTML: (attrs) => {
            if (!attrs.indent) return {};
            return { 'data-indent': String(attrs.indent), style: `margin-left:${attrs.indent * 2}em` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      indent: () => ({ editor, state, tr, dispatch }) => {
        // Lists: sink the list item one level deeper
        if (editor.can().sinkListItem('listItem')) return editor.chain().sinkListItem('listItem').run();
        if (editor.can().sinkListItem('taskItem')) return editor.chain().sinkListItem('taskItem').run();
        // Blocks: increase margin-left indent attribute
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if ((INDENT_TYPES as readonly string[]).includes(node.type.name)) {
            const next = Math.min(MAX_INDENT, (node.attrs.indent || 0) + 1);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
      outdent: () => ({ editor, state, tr, dispatch }) => {
        if (editor.can().liftListItem('listItem')) return editor.chain().liftListItem('listItem').run();
        if (editor.can().liftListItem('taskItem')) return editor.chain().liftListItem('taskItem').run();
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if ((INDENT_TYPES as readonly string[]).includes(node.type.name) && node.attrs.indent > 0) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: node.attrs.indent - 1 });
            changed = true;
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});

/* ─── ClassPreserve Extension ───
   Makes TipTap keep the `class` attribute when parsing block elements so that
   injected Content Studio CSS (e.g. .data-callout, .deck, .faq-q) still applies. */
const ClassPreserveExtension = Extension.create({
  name: 'classPreserve',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem'],
      attributes: {
        class: {
          default: null,
          parseHTML: (el) => el.getAttribute('class') || null,
          renderHTML: (attrs) => attrs.class ? { class: attrs.class as string } : {},
        },
      },
    }];
  },
});

/* ═══════════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════════ */
export interface RichTextEditorClientProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/* ═══════════════════════════════════════════════════════════════════
   Toolbar Button
   ═══════════════════════════════════════════════════════════════════ */
function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
  style: extraStyle,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`tiptap-btn${active ? ' active' : ''}`}
      style={extraStyle}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="tiptap-sep" />;

/* ═══════════════════════════════════════════════════════════════════
   Color Picker (lightweight)
   ═══════════════════════════════════════════════════════════════════ */
const PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

function ColorPicker({ currentColor, onSelect, label }: {
  currentColor: string;
  onSelect: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="tiptap-btn"
        title={label}
        onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }}
        style={{ fontSize: 14 }}
      >
        <span style={{ borderBottom: `3px solid ${currentColor || '#000'}`, paddingBottom: 1 }}>
          {label === 'Text Color' ? 'A' : '█'}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 999,
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
            padding: 6, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 200,
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
              style={{
                width: 18, height: 18, background: c, border: c === '#ffffff' ? '1px solid #ccc' : '1px solid transparent',
                borderRadius: 2, cursor: 'pointer', padding: 0,
              }}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(''); setOpen(false); }}
            style={{
              gridColumn: 'span 10', padding: '3px 0', fontSize: 11, cursor: 'pointer',
              border: '1px solid #e2e8f0', borderRadius: 2, background: '#f8f9fa', marginTop: 2,
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Toolbar
   ═══════════════════════════════════════════════════════════════════ */
const FONT_SIZES = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px', '48px', '56px', '64px'];

function FontSizePicker({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const current = editor.getAttributes('textStyle').fontSize || '';
  const currentPx = current ? parseFloat(current) : 16;

  const decrease = () => {
    const idx = FONT_SIZES.indexOf(current);
    const next = idx > 0 ? FONT_SIZES[idx - 1] : FONT_SIZES[0];
    editor.chain().focus().setFontSize(next).run();
  };

  const increase = () => {
    const idx = FONT_SIZES.indexOf(current);
    const next = idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : FONT_SIZES[FONT_SIZES.length - 1];
    editor.chain().focus().setFontSize(next).run();
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <button
        type="button"
        className="tiptap-btn"
        title="Decrease font size"
        onMouseDown={(e) => { e.preventDefault(); decrease(); }}
        style={{ padding: '4px 6px', fontWeight: 700, fontSize: 14 }}
      >−</button>
      <select
        className="tiptap-select"
        title="Font Size"
        value={current}
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            editor.chain().focus().setFontSize(val).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        style={{ width: 72 }}
      >
        <option value="">Default</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        type="button"
        className="tiptap-btn"
        title="Increase font size"
        onMouseDown={(e) => { e.preventDefault(); increase(); }}
        style={{ padding: '4px 6px', fontWeight: 700, fontSize: 14 }}
      >+</button>
    </div>
  );
}

function MenuBar({ editor, onImageUpload, onHtmlUpload, onPasteHtml }: { editor: ReturnType<typeof useEditor> | null; onImageUpload: (file: File) => void; onHtmlUpload: (file: File) => void; onPasteHtml: () => void }) {
  // Hooks MUST come before any conditional return (Rules of Hooks)
  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    
    // Ask if link should be nofollow (default: dofollow)
    const isNofollow = window.confirm('Make this link nofollow?\n\nOK = nofollow, Cancel = dofollow (default)');
    const rel = isNofollow ? 'noopener noreferrer nofollow' : 'noopener noreferrer';
    
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, rel }).run();
  }, [editor]);

  const addImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter YouTube URL:');
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-toolbar">
      {/* ── Row 1: Main formatting ── */}
      <div className="tiptap-toolbar-row">
        {/* Undo / Redo */}
        <Btn disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">↩</Btn>
        <Btn disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">↪</Btn>

        <Sep />

        {/* Headings */}
        <Btn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</Btn>
        <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</Btn>
        <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</Btn>
        <Btn active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} title="Heading 4">H4</Btn>
        <Btn active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">¶</Btn>

        <Sep />

        {/* Text formatting */}
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><strong>B</strong></Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><em>I</em></Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></Btn>
        <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">&lt;/&gt;</Btn>
        <Btn active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript">X₂</Btn>
        <Btn active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript">X²</Btn>

        <Sep />

        {/* Font Size */}
        <FontSizePicker editor={editor} />

        <Sep />

        {/* Colors */}
        <ColorPicker
          label="Text Color"
          currentColor={editor.getAttributes('textStyle').color || '#000000'}
          onSelect={(c) => c ? editor.chain().focus().setColor(c).run() : editor.chain().focus().unsetColor().run()}
        />
        <ColorPicker
          label="Highlight"
          currentColor={editor.getAttributes('highlight').color || '#ffff00'}
          onSelect={(c) => c ? editor.chain().focus().toggleHighlight({ color: c }).run() : editor.chain().focus().unsetHighlight().run()}
        />
      </div>

      {/* ── Row 2: Structure ── */}
      <div className="tiptap-toolbar-row">
        {/* Lists */}
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">• List</Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">1. List</Btn>
        <Btn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List">☑ Tasks</Btn>

        <Sep />

        {/* Indent / Outdent */}
        <Btn onClick={() => editor.chain().focus().indent().run()} title="Indent (Tab)">⇥ Indent</Btn>
        <Btn onClick={() => editor.chain().focus().outdent().run()} title="Outdent (Shift+Tab)">⇤ Outdent</Btn>

        <Sep />

        {/* Alignment */}
        <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="10" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="11" width="8" height="2" rx="1"/></svg>
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2" y="5" width="10" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="3" y="11" width="8" height="2" rx="1"/></svg>
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="4" y="5" width="10" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="6" y="11" width="8" height="2" rx="1"/></svg>
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="14" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/></svg>
        </Btn>

        <Sep />

        {/* Block elements */}
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">❝ Quote</Btn>
        <Btn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">{'{ }'}</Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">― Line</Btn>

        <Sep />

        {/* Media & Table */}
        <Btn active={editor.isActive('link')} onClick={addLink} title="Insert Link">🔗 Link</Btn>
        {/* Image: file upload takes priority, URL prompt as fallback */}
        <label className="tiptap-btn" title="Upload Image" style={{ cursor: 'pointer', margin: 0 }}>
          🖼 Image
          <input
            type="file"
            accept="image/*,.webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onImageUpload(file);
                e.target.value = '';
              }
            }}
          />
        </label>
        <Btn onClick={addImageUrl} title="Insert Image by URL">🔗 Img URL</Btn>
        <Btn onClick={addYoutube} title="Embed YouTube">▶ YouTube</Btn>
        <Btn onClick={insertTable} title="Insert Table">⊞ Table</Btn>

        <Sep />

        {/* Clear */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">✕ Clear</Btn>

        <Sep />

        {/* HTML Upload */}
        <label className="tiptap-btn" title="Upload HTML file — replaces editor content" style={{ cursor: 'pointer', margin: 0 }}>
          ⬆ HTML
          <input
            type="file"
            accept=".html,.htm"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onHtmlUpload(file);
                e.target.value = '';
              }
            }}
          />
        </label>
        <Btn onClick={onPasteHtml} title="Paste HTML — opens a text area to paste raw HTML">📋 Paste HTML</Btn>
      </div>

      {/* ── Table sub-toolbar (only when cursor is inside a table) ── */}
      {editor.isActive('table') && (
        <div className="tiptap-toolbar-row tiptap-table-bar">
          <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Table:</span>
          <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Column Before">+ Col ←</Btn>
          <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column After">+ Col →</Btn>
          <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column">− Col</Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Before">+ Row ↑</Btn>
          <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row After">+ Row ↓</Btn>
          <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row">− Row</Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().mergeCells().run()} title="Merge Cells">Merge</Btn>
          <Btn onClick={() => editor.chain().focus().splitCell().run()} title="Split Cell">Split</Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table" style={{ color: '#e53e3e' }}>🗑 Table</Btn>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Editor
   ═══════════════════════════════════════════════════════════════════ */
export default function RichTextEditorClient({
  value,
  onChange,
  placeholder = 'Write here...',
  minHeight = 200,
}: RichTextEditorClientProps) {
  const safeInitialContent = normalizeEditorHtml(value);
  const [imageUploading, setImageUploading] = useState(false);
  const [htmlModalOpen, setHtmlModalOpen] = useState(false);
  const [htmlModalText, setHtmlModalText] = useState('');
  const [htmlModalPreview, setHtmlModalPreview] = useState<string | null>(null);
  const [injectedCss, setInjectedCss] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
      }),
      Underline,
      IndentExtension,
      ClassPreserveExtension,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'listItem', 'bulletList', 'orderedList'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontSize,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Youtube.configure({ width: 640, height: 360 }),
      CharacterCount,
    ],
    content: safeInitialContent,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height:${minHeight}px; font-family: 'Roboto', sans-serif;`,
      },
      transformPastedHTML: (html: string) => sanitizeHtmlForPaste(html),
    },
  });

  // Sync external value changes (e.g. form reset), but avoid re-setting during
  // normal typing (which would cause an onUpdate → value → setContent loop).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    const safeValue = normalizeEditorHtml(value);
    // Only sync if the value has meaningfully changed (avoids infinite loop)
    if (safeValue !== currentHtml) {
      editor.commands.setContent(safeValue, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (imageUploading) return;
    setImageUploading(true);
    try {
      // Try presign upload; fall back to base64 data URL if unavailable
      const token = getAdminToken();

      if (token) {
        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            filename: file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
            contentType: file.type || 'image/jpeg',
            _token: token,
          }),
        });
        if (presignRes.ok) {
          const presignData = await presignRes.json();
          if (presignData.success && presignData.data?.uploadUrl && presignData.data?.fileUrl) {
            const uploadRes = await fetch(presignData.data.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'image/jpeg' },
              body: file,
            });
            if (uploadRes.ok) {
              editor?.chain().focus().setImage({ src: presignData.data.fileUrl }).run();
              return;
            }
          }
        }
      }

      // Fallback: base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (src) editor?.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (src) editor?.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
    }
  }, [editor, imageUploading]);

  const handleHtmlUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (!raw || !editor) return;
      const sanitized = sanitizeHtmlForPaste(raw);
      const css = extractContentCss(raw);
      if (css) setInjectedCss(css);
      // Don't save extracted CSS — globals.css already defines all design element
      // classes (.deck, .data-callout, .key-takeaways, .faq-q, etc.) with correct sizing.
      editor.commands.setContent(sanitized, { emitUpdate: false });
      onChange(sanitized);
    };
    reader.readAsText(file);
  }, [editor, onChange]);

  const applyPastedHtml = useCallback(() => {
    if (!editor || !htmlModalText.trim()) return;
    const sanitized = sanitizeHtmlForPaste(htmlModalText);
    const css = extractContentCss(htmlModalText);
    if (css) setInjectedCss(css);
    // Don't save extracted CSS — globals.css already defines all design element
    // classes (.deck, .data-callout, .key-takeaways, .faq-q, etc.) with correct sizing.
    editor.commands.setContent(sanitized, { emitUpdate: false });
    onChange(sanitized);
    setHtmlModalOpen(false);
    setHtmlModalText('');
  }, [editor, htmlModalText, onChange]);

  const charCount = editor?.storage.characterCount;

  return (
    <div className="tiptap-wrapper">
      <style>{EDITOR_STYLES}</style>
      {injectedCss && <style>{injectedCss}</style>}
      {imageUploading && (
        <div style={{ padding: '4px 12px', background: '#fef9c3', fontSize: 12, color: '#92400e', borderBottom: '1px solid #fde68a' }}>
          Uploading image…
        </div>
      )}
      <MenuBar editor={editor} onImageUpload={handleImageUpload} onHtmlUpload={handleHtmlUpload} onPasteHtml={() => setHtmlModalOpen(true)} />

      {/* Bubble menu for quick formatting on selection */}
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="tiptap-bubble">
            <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></Btn>
            <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></Btn>
            <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></Btn>
            <Btn active={editor.isActive('link')} onClick={() => {
              const prev = editor.getAttributes('link').href || '';
              const url = window.prompt('URL', prev);
              if (url === null) return;
              if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
              
              // Ask if link should be nofollow (default: dofollow)
              const isNofollow = window.confirm('Make this link nofollow?\n\nOK = nofollow, Cancel = dofollow (default)');
              const rel = isNofollow ? 'noopener noreferrer nofollow' : 'noopener noreferrer';
              
              editor.chain().focus().extendMarkRange('link').setLink({ href: url, rel }).run();
            }} title="Link">🔗</Btn>
          </div>
        </BubbleMenu>
      )}

      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>

      {/* Status bar */}
      {charCount && (
        <div className="tiptap-statusbar">
          {charCount.characters()} characters · {charCount.words()} words
        </div>
      )}

      {/* Paste HTML modal */}
      {htmlModalOpen && (
        <div className="tiptap-html-overlay" onMouseDown={() => { setHtmlModalOpen(false); setHtmlModalPreview(null); }}>
          <div className="tiptap-html-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tiptap-html-modal-header">
              <span>Paste HTML</span>
              <button type="button" className="tiptap-html-modal-close" onClick={() => { setHtmlModalOpen(false); setHtmlModalPreview(null); }}>✕</button>
            </div>
            <textarea
              className="tiptap-html-modal-textarea"
              placeholder="Paste your HTML here…"
              value={htmlModalText}
              autoFocus
              onChange={(e) => { setHtmlModalText(e.target.value); setHtmlModalPreview(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setHtmlModalOpen(false); setHtmlModalPreview(null); }
              }}
            />
            {htmlModalPreview !== null && (
              <div className="tiptap-html-modal-preview">
                <div className="tiptap-html-modal-preview-label">Converted HTML (what will be applied):</div>
                <textarea className="tiptap-html-modal-textarea tiptap-html-modal-preview-area" readOnly value={htmlModalPreview} />
              </div>
            )}
            <div className="tiptap-html-modal-footer">
              <button type="button" className="tiptap-html-modal-cancel" onClick={() => { setHtmlModalOpen(false); setHtmlModalPreview(null); }}>Cancel</button>
              <button type="button" className="tiptap-html-modal-preview-btn" onClick={() => setHtmlModalPreview(sanitizeHtmlForPaste(htmlModalText))} disabled={!htmlModalText.trim()}>Preview</button>
              <button type="button" className="tiptap-html-modal-apply" onClick={applyPastedHtml} disabled={!htmlModalText.trim()}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════ */
const EDITOR_STYLES = `
/* Wrapper */
.tiptap-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  transition: border-color 0.2s;
}
.tiptap-wrapper:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
}

/* Toolbar */
.tiptap-toolbar {
  background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  padding: 4px 6px;
}
.tiptap-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px 0;
}
.tiptap-table-bar {
  border-top: 1px solid #e2e8f0;
  margin-top: 2px;
  padding-top: 4px;
  background: #fefce8;
}

/* Button */
.tiptap-btn {
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: inherit;
}
.tiptap-btn:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #cbd5e1;
}
.tiptap-btn.active {
  background: #eef2ff;
  border-color: #667eea;
  color: #4338ca;
  font-weight: 600;
}
.tiptap-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Separator */
.tiptap-sep {
  width: 1px;
  height: 18px;
  background: #cbd5e1;
  margin: 0 4px;
  display: inline-block;
  vertical-align: middle;
}

/* Font size / select dropdown */
.tiptap-select {
  padding: 3px 5px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  height: 28px;
}
.tiptap-select:focus {
  outline: none;
  border-color: #667eea;
}

/* Bubble menu */
.tiptap-bubble {
  display: flex;
  gap: 2px;
  background: #1e293b;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.tiptap-bubble .tiptap-btn {
  color: #e2e8f0;
}
.tiptap-bubble .tiptap-btn:hover {
  background: #334155;
  border-color: transparent;
}
.tiptap-bubble .tiptap-btn.active {
  background: #4338ca;
  border-color: transparent;
  color: white;
}

/* Status bar */
.tiptap-statusbar {
  padding: 4px 12px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  text-align: right;
}

/* ─── Editor content area — mirrors #mvp-content-main article styles ─── */
.tiptap-editor .ProseMirror {
  outline: none;
  padding: 16px;
  font-family: 'Roboto', sans-serif;
  font-size: 1.1rem;
  line-height: 1.55;
  color: #000;
}
.tiptap-editor .ProseMirror > * + * {
  margin-top: 0;
}

/* Headings — matches #mvp-content-main h2/h3/h4/h5/h6 */
.tiptap-editor .ProseMirror h1,
.tiptap-editor .ProseMirror h2,
.tiptap-editor .ProseMirror h3,
.tiptap-editor .ProseMirror h4,
.tiptap-editor .ProseMirror h5,
.tiptap-editor .ProseMirror h6 {
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
  margin: 10px 0;
  overflow: hidden;
  width: 100%;
  color: #000;
}
.tiptap-editor .ProseMirror h1 { font-size: 2rem; }
.tiptap-editor .ProseMirror h2 { font-size: 1.8rem; }
.tiptap-editor .ProseMirror h3 { font-size: 1.6rem; }
.tiptap-editor .ProseMirror h4 { font-size: 1.4rem; }
.tiptap-editor .ProseMirror h5 { font-size: 1.2rem; }
.tiptap-editor .ProseMirror h6 { font-size: 1rem; }

/* Paragraphs — matches #mvp-content-main p */
.tiptap-editor .ProseMirror p {
  color: #000;
  display: block;
  font-family: 'Roboto', sans-serif;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.55;
  margin-bottom: 20px;
}

/* Links — matches #mvp-content-main p a */
.tiptap-editor .ProseMirror a {
  color: #E62E69;
  text-decoration: none;
  cursor: pointer;
  transition: text-decoration 0.2s;
}
.tiptap-editor .ProseMirror a:hover {
  text-decoration: underline;
}

/* Lists — matches #mvp-content-main ul/ol */
.tiptap-editor .ProseMirror ul {
  list-style: disc outside;
  margin: 10px 0;
}
.tiptap-editor .ProseMirror ol {
  list-style: decimal outside;
  margin: 10px 0;
}
.tiptap-editor .ProseMirror ul li,
.tiptap-editor .ProseMirror ol li {
  margin-left: 50px;
  padding: 5px 0;
  font-family: 'Roboto', sans-serif;
  font-size: 1.1rem;
  line-height: 1.55;
}
.tiptap-editor .ProseMirror li p { margin: 0; }

/* Task list */
.tiptap-editor .ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
  margin-left: 0;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-left: 0;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li label {
  margin-top: 3px;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  color: #94a3b8;
}

/* Blockquote — matches #mvp-content-main blockquote p */
.tiptap-editor .ProseMirror blockquote {
  margin: 10px 0;
}
.tiptap-editor .ProseMirror blockquote p {
  color: #000;
  font-family: 'Oswald', sans-serif;
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 30px 10%;
  width: 80%;
}
.tiptap-editor .ProseMirror blockquote p em {
  color: #555;
  display: inline-block;
  font-size: 1rem;
  font-weight: 400;
  font-style: normal;
}

/* Code */
.tiptap-editor .ProseMirror code {
  font-size: 1rem;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.tiptap-editor .ProseMirror pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px 20px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.6em 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  line-height: 1.6;
}
.tiptap-editor .ProseMirror pre code {
  background: none; padding: 0; color: inherit; font-size: inherit; border-radius: 0;
}

/* Horizontal rule */
.tiptap-editor .ProseMirror hr {
  border: none;
  border-top: 2px solid #e2e8f0;
  margin: 1.2em 0;
}

/* Images — matches article img */
.tiptap-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  margin: 0.6em 0;
}
.tiptap-editor .ProseMirror img.ProseMirror-selectednode {
  outline: 3px solid #667eea;
  outline-offset: 2px;
}

/* YouTube iframe */
.tiptap-editor .ProseMirror div[data-youtube-video] {
  margin: 0.8em 0;
}
.tiptap-editor .ProseMirror div[data-youtube-video] iframe {
  max-width: 100%;
}

/* Table — matches #mvp-content-main table */
.tiptap-editor .ProseMirror table {
  font-size: 0.9rem;
  margin: 0 0 20px;
  width: 100%;
  border-collapse: collapse;
}
.tiptap-editor .ProseMirror thead {
  background: #ccc;
}
.tiptap-editor .ProseMirror tbody tr {
  background: #eee;
}
.tiptap-editor .ProseMirror tbody tr:nth-child(2n+2) {
  background: none;
}
.tiptap-editor .ProseMirror th,
.tiptap-editor .ProseMirror td {
  padding: 5px 1.5%;
  border: 1px solid #e2e8f0;
  text-align: left;
  min-width: 80px;
  vertical-align: top;
  position: relative;
}
.tiptap-editor .ProseMirror td p,
.tiptap-editor .ProseMirror th p { margin: 0; }
.tiptap-editor .ProseMirror .selectedCell {
  background: #eef2ff;
}
.tiptap-editor .ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #667eea;
  cursor: col-resize;
}

/* Highlight */
.tiptap-editor .ProseMirror mark {
  border-radius: 2px;
  padding: 1px 2px;
}

/* Placeholder */
.tiptap-editor .ProseMirror .is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #94a3b8;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* Selection */
.tiptap-editor .ProseMirror ::selection {
  background: rgba(102,126,234,0.25);
}

/* Restore bold/italic/underline overridden by theme CSS reset */
.tiptap-editor .ProseMirror strong,
.tiptap-editor .ProseMirror b { font-weight: 700; }
.tiptap-editor .ProseMirror em,
.tiptap-editor .ProseMirror i { font-style: italic; }
.tiptap-editor .ProseMirror u { text-decoration: underline; }
.tiptap-editor .ProseMirror s { text-decoration: line-through; }

/* ── Design elements: deck, data-callout, key-takeaways, faq ── */
.tiptap-editor .ProseMirror .deck {
  font-size: 1rem;
  color: #555;
  margin-bottom: 16px;
  font-style: italic;
  padding-left: 12px;
  border-left: 3px solid #ccc;
  line-height: 1.6;
}
.tiptap-editor .ProseMirror .data-callout {
  margin: 16px 0;
  padding: 14px 16px;
  background: #FFF4F3;
  color: #111;
  border-radius: 8px;
  border-left: 4px solid #FFF4F3;
}
.tiptap-editor .ProseMirror .data-callout p {
  color: #111;
  font-size: 0.95rem;
  margin-bottom: 0;
}
.tiptap-editor .ProseMirror .data-callout strong {
  font-size: 1rem;
  display: block;
  margin-bottom: 4px;
  color: #e8186d;
}
.tiptap-editor .ProseMirror .key-takeaways {
  margin: 16px 0;
  padding: 14px 16px;
  background: #f5f4f0;
  border: 1px solid #e2e1da;
  border-radius: 8px;
}
.tiptap-editor .ProseMirror .key-takeaways ul {
  padding-left: 20px;
  margin: 6px 0 0;
}
.tiptap-editor .ProseMirror .key-takeaways li {
  margin-bottom: 6px;
  font-size: 0.95rem;
  margin-left: 0;
  padding: 0;
}
.tiptap-editor .ProseMirror .faq-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid #e5e5e5;
}
.tiptap-editor .ProseMirror .faq-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0ee;
}
.tiptap-editor .ProseMirror .faq-q {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
}
.tiptap-editor .ProseMirror .faq-a {
  font-size: 0.95rem;
  color: #444;
  line-height: 1.6;
}
.tiptap-editor .ProseMirror .source-footer {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
  font-size: 0.875rem;
  color: #777;
}
.tiptap-editor .ProseMirror .bl-link {
  display: block;
  padding: 8px 12px;
  background: #f0f2f8;
  color: #4361ee;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid #e4e6ef;
}

/* Paste HTML modal */
.tiptap-html-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tiptap-html-modal {
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
  width: min(680px, 95vw);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tiptap-html-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}
.tiptap-html-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #94a3b8;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
}
.tiptap-html-modal-close:hover { background: #f1f5f9; color: #475569; }
.tiptap-html-modal-textarea {
  width: 100%;
  height: 320px;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #1e293b;
  border: none;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  background: #f8fafc;
}
.tiptap-html-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}
.tiptap-html-modal-cancel {
  padding: 6px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
}
.tiptap-html-modal-cancel:hover { background: #f1f5f9; }
.tiptap-html-modal-apply {
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  background: #667eea;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.tiptap-html-modal-apply:hover:not(:disabled) { background: #4f46e5; }
.tiptap-html-modal-apply:disabled { opacity: 0.45; cursor: default; }
.tiptap-html-modal-preview-btn {
  padding: 6px 16px;
  border: 1px solid #667eea;
  border-radius: 6px;
  background: white;
  color: #667eea;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.tiptap-html-modal-preview-btn:hover:not(:disabled) { background: #eef2ff; }
.tiptap-html-modal-preview-btn:disabled { opacity: 0.45; cursor: default; }
.tiptap-html-modal-preview {
  border-top: 1px dashed #e2e8f0;
  background: #fffbeb;
}
.tiptap-html-modal-preview-label {
  padding: 6px 16px 2px;
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tiptap-html-modal-preview-area {
  height: 200px;
  background: #fffbeb;
  color: #78350f;
  border-top: none;
}
`;
