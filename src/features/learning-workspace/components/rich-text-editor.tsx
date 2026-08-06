'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';

interface RichTextEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-[#002B5C] text-[#C5A258]'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ content, onChange, placeholder = 'Start writing...', editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {},
        orderedList: {},
        codeBlock: {},
        bold: {},
        italic: {},
        code: {},
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content ?? undefined,
    editable,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[120px] px-4 py-3 focus:outline-none',
      },
    },
  });

  const handleHeading = useCallback((level: 1 | 2 | 3) => {
    if (!editor) return;
    editor.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const handleBold = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }, [editor]);

  const handleItalic = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const handleCode = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const handleBulletList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  const handleOrderedList = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-700 bg-zinc-900/80 px-2 py-1.5">
          <ToolbarButton
            onClick={() => handleHeading(1)}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => handleHeading(2)}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => handleHeading(3)}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-zinc-700" />

          <ToolbarButton
            onClick={handleBold}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={handleItalic}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <span className="italic">I</span>
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-zinc-700" />

          <ToolbarButton
            onClick={handleCode}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            onClick={handleBulletList}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            &#8226; List
          </ToolbarButton>
          <ToolbarButton
            onClick={handleOrderedList}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            1. List
          </ToolbarButton>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
