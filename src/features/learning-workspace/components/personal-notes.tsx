'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';

interface PersonalNotesProps {
  subject: string;
  reading: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Personal notes for a reading. Stored in localStorage until database is connected.
 */
export function PersonalNotes({ subject, reading }: PersonalNotesProps) {
  const storageKey = `notes-${subject}-${reading}`;

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return localStorage.getItem(storageKey) ?? '[]';
  }, [storageKey]);

  const getServerSnapshot = useCallback(() => '[]', []);

  const rawNotes = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const notes: Note[] = (() => {
    try { return JSON.parse(rawNotes); } catch { return []; }
  })();

  const [editing, setEditing] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editContent, setEditContent] = useState('');

  // Save to localStorage (triggers useSyncExternalStore via storage event)
  const saveNotes = (updated: Note[]) => {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    // Dispatch a storage event so useSyncExternalStore re-renders
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setNewNote('');
  };

  const updateNote = (id: string) => {
    if (!editContent.trim()) return;
    const updated = notes.map(n =>
      n.id === id ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() } : n
    );
    saveNotes(updated);
    setEditing(null);
    setEditContent('');
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* New note input */}
      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a personal note for this reading..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          rows={3}
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button onClick={() => updateNote(note.id)} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">Save</button>
                  <button onClick={() => setEditing(null)} className="rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{note.content}</p>
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
