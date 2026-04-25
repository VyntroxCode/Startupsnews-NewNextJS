'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-text-style';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { normalizeEditorHtml } from '@/shared/utils/editor-html';

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
function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const addLink = useCallback(() => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

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

        {/* Alignment */}
        <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">⬛◽◽</Btn>
        <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">◽⬛◽</Btn>
        <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">◽◽⬛</Btn>
        <Btn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">⬛⬛⬛</Btn>

        <Sep />

        {/* Block elements */}
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">❝ Quote</Btn>
        <Btn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">{'{ }'}</Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">― Line</Btn>

        <Sep />

        {/* Media & Table */}
        <Btn active={editor.isActive('link')} onClick={addLink} title="Insert Link">🔗 Link</Btn>
        <Btn onClick={addImage} title="Insert Image">🖼 Image</Btn>
        <Btn onClick={addYoutube} title="Embed YouTube">▶ YouTube</Btn>
        <Btn onClick={insertTable} title="Insert Table">⊞ Table</Btn>

        <Sep />

        {/* Clear */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">✕ Clear</Btn>
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        // Disable built-ins because we register custom Link/Underline below.
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Youtube.configure({ width: 640, height: 360 }),
      CharacterCount,
      Typography,
    ],
    content: safeInitialContent,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height:${minHeight}px;`,
      },
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

  const charCount = editor?.storage.characterCount;

  return (
    <div className="tiptap-wrapper">
      <style>{EDITOR_STYLES}</style>
      <MenuBar editor={editor} />

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
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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

/* ─── Editor content area ─── */
.tiptap-editor .ProseMirror {
  outline: none;
  padding: 16px;
  font-size: 15px;
  line-height: 1.7;
  color: #1e293b;
}
.tiptap-editor .ProseMirror > * + * {
  margin-top: 0.6em;
}

/* Headings */
.tiptap-editor .ProseMirror h1 { font-size: 1.8em; font-weight: 700; line-height: 1.2; margin: 0.8em 0 0.4em; color: #0f172a; }
.tiptap-editor .ProseMirror h2 { font-size: 1.45em; font-weight: 650; line-height: 1.25; margin: 0.7em 0 0.35em; color: #0f172a; }
.tiptap-editor .ProseMirror h3 { font-size: 1.2em; font-weight: 600; line-height: 1.3; margin: 0.6em 0 0.3em; color: #1e293b; }
.tiptap-editor .ProseMirror h4 { font-size: 1.05em; font-weight: 600; line-height: 1.35; margin: 0.5em 0 0.25em; color: #1e293b; }

/* Paragraphs */
.tiptap-editor .ProseMirror p { margin: 0.4em 0; }

/* Links */
.tiptap-editor .ProseMirror a {
  color: #4338ca;
  text-decoration: underline;
  text-decoration-color: rgba(67,56,202,0.3);
  cursor: pointer;
  transition: text-decoration-color 0.2s;
}
.tiptap-editor .ProseMirror a:hover {
  text-decoration-color: rgba(67,56,202,0.8);
}

/* Lists */
.tiptap-editor .ProseMirror ul,
.tiptap-editor .ProseMirror ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.tiptap-editor .ProseMirror li { margin: 0.15em 0; }
.tiptap-editor .ProseMirror li p { margin: 0.1em 0; }

/* Task list */
.tiptap-editor .ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li label {
  margin-top: 3px;
}
.tiptap-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  color: #94a3b8;
}

/* Blockquote */
.tiptap-editor .ProseMirror blockquote {
  border-left: 4px solid #667eea;
  padding: 0.5em 1em;
  margin: 0.6em 0;
  background: #f8fafc;
  border-radius: 0 6px 6px 0;
  color: #475569;
  font-style: italic;
}

/* Code */
.tiptap-editor .ProseMirror code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #c026d3;
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

/* Images */
.tiptap-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.6em 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
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
  border-radius: 8px;
  max-width: 100%;
}

/* Table */
.tiptap-editor .ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.tiptap-editor .ProseMirror th,
.tiptap-editor .ProseMirror td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  min-width: 80px;
  vertical-align: top;
  position: relative;
}
.tiptap-editor .ProseMirror th {
  background: #f1f5f9;
  font-weight: 600;
  color: #374151;
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
`;
