'use client';

import { useState, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import { RichTextEditor } from './rich-text-editor';

interface PersonalNotesProps {
  subject: string;
  reading: string;
}

interface Note {
  id: string;
  content: JSONContent | null;
  plainText?: string;
  createdAt: string;
  updatedAt: string;
}

function getStorageKey(subject: string, reading: string): string {
  return `notes-${subject}-${reading}`;
}

function loadNotes(storageKey: string): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function persistNotes(storageKey: string, notes: Note[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

/**
 * Personal notes for a reading using Tiptap rich text editor.
 * Stored in localStorage as Tiptap JSON until database is connected.
 */
export function PersonalNotes({ subject, reading }: PersonalNotesProps) {
  const storageKey = getStorageKey(subject, reading);

  // Use useState lazy initializer (NEVER useSyncExternalStore for one-time reads)
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(storageKey));
  const [editing, setEditing] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<JSONContent | null>(null);
  const [editContent, setEditContent] = useState<JSONContent | null>(null);

  const saveNotes = useCallback((updated: Note[]) => {
    setNotes(updated);
    persistNotes(storageKey, updated);
  }, [storageKey]);

  const addNote = useCallback(() => {
    if (!newNoteContent) return;
    // Check if content is empty (only has an empty paragraph)
    const hasContent = newNoteContent.content?.some(node => {
      if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) return false;
      return true;
    });
    if (!hasContent) return;

    const note: Note = {
      id: crypto.randomUUID(),
      content: newNoteContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setNewNoteContent(null);
  }, [newNoteContent, notes, saveNotes]);

  const updateNote = useCallback((id: string) => {
    if (!editContent) return;
    const updated = notes.map(n =>
      n.id === id ? { ...n, content: editContent, updatedAt: new Date().toISOString() } : n
    );
    saveNotes(updated);
    setEditing(null);
    setEditContent(null);
  }, [editContent, notes, saveNotes]);

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  }, [notes, saveNotes]);

  return (
    <div className="space-y-4">
      {/* New note input */}
      <div className="space-y-2">
        <RichTextEditor
          key="new-note"
          content={newNoteContent}
          onChange={setNewNoteContent}
          placeholder="Write a personal note for this reading..."
        />
        <button
          onClick={addNote}
          disabled={!newNoteContent}
          className="rounded-lg bg-[#002B5C] px-4 py-2 text-sm font-medium text-[#C5A258] transition-colors hover:bg-[#003875] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Note
        </button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            {editing === note.id ? (
              <div className="space-y-2">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateNote(note.id)}
                    className="rounded bg-[#002B5C] px-3 py-1 text-xs text-[#C5A258] hover:bg-[#003875]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <RichTextEditor
                  content={note.content}
                  onChange={() => {}}
                  editable={false}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(note.id); setEditContent(note.content); }}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-xs text-red-400/70 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <p className="py-4 text-center text-xs text-zinc-600">No personal notes yet. Add one above.</p>
      )}

      <p className="text-[10px] text-zinc-700">Notes are stored locally in your browser. They will migrate to the database when Supabase is connected.</p>
    </div>
  );
}
