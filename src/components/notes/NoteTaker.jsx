import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { NoteCard } from './NoteCard';
import { NoteDetailDrawer } from './NoteDetailDrawer';
import VoicePill from '../ui/VoicePill';
import RubberSegment from '../ui/RubberSegment';
import SwipeRow from '../ui/SwipeRow';
import { Plus, Pin, Search, StickyNote, Sparkles, Filter, LayoutGrid, List, SlidersHorizontal, Check } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

const CATEGORIES = [
  { id: 'Note', label: 'Note 📝' },
  { id: 'Idea', label: 'Idea 💡' },
  { id: 'Task', label: 'Task 📌' },
  { id: 'Study', label: 'Study 📚' },
  { id: 'Important', label: 'Important ⚡' },
];

const COLORS = [
  { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500' },
];

export function NoteTaker({ isCompact = false }) {
  const { notes = [], addNote, updateNote, deleteNote, togglePinNote, toggleCheckNote } = useData();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Note');
  const [color, setColor] = useState('blue');
  const [isPinned, setIsPinned] = useState(false);
  const [columnLayout, setColumnLayout] = useState('2-col'); // '2-col' | '1-col'
  const [selectedDrawerNote, setSelectedDrawerNote] = useState(null);

  // Voice note speech recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Voice note speech recognition with VoicePill (Web Speech API)
  const handleVoiceStart = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          setText(prev => (prev ? prev.trim() + ' ' + transcript.trim() : transcript.trim()));
        }
      };

      recognition.onerror = (e) => {
        console.warn('[Kurama Voice Note] Recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[Kurama Voice Note] Could not start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleVoiceStop = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() && !title.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    addNote({
      title: title.trim(),
      text: text.trim(),
      tag,
      color,
      isPinned
    });

    // Reset composer
    setTitle('');
    setText('');
    setIsPinned(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Sort: pinned notes first, then chronological descending
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const filteredNotes = sortedNotes.filter((note) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.text && note.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.tag && note.tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pinned') return note.isPinned;
    if (activeFilter === 'active') return !note.isDone;
    if (activeFilter === 'completed') return note.isDone;
    return note.tag === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* "Write there and put it there" Composer */}
      <div className="relative rounded-2xl border-2 border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 sm:p-5 shadow-xs transition-surface">
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#00B4FF] flex items-center justify-center text-black shadow-glow">
                <StickyNote className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Write a Note & Put It There
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* React Bits VoicePill Dictation Capsule */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl border border-border-dark bg-[#080D19]/80" title="Dictate note with your voice (hold or tap)">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295B0] hidden sm:inline">
                  {isListening ? 'Listening' : 'Voice'}
                </span>
                <VoicePill
                  accentColor="#00B4FF"
                  iconColor="#8295B0"
                  background="#0B1220"
                  size={26}
                  shape="pill"
                  reach={8}
                  showTime={true}
                  waveform={true}
                  slideToCancel={true}
                  reactive="mic"
                  onStart={handleVoiceStart}
                  onStop={handleVoiceStop}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  isPinned
                    ? 'border-[#00B4FF] bg-blue-950/70 text-[#00B4FF] shadow-glow-sm'
                    : 'border-border-dark text-[#8295B0] hover:bg-surfaceHover-dark hover:text-white'
                }`}
                title="Pin this note to top"
              >
                <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
              </button>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional, e.g. Book Recommendation, Next Steps...)"
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-border-dark bg-[#080D19] text-white placeholder:text-[#8295B0]/70 focus:outline-hidden focus:ring-1 focus:ring-[#00B4FF]"
            />
          </div>

          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={isCompact ? 2 : 3}
              placeholder="Write your note here... (Press Ctrl+Enter to put it there)"
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-border-dark bg-[#080D19] text-white placeholder:text-[#8295B0]/70 focus:outline-hidden focus:ring-1 focus:ring-[#00B4FF] resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Bottom Bar: Category, Color Palette, and Submit Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Category selector */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTag(cat.id)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                      tag === cat.id
                        ? 'bg-[#00B4FF] text-black font-bold shadow-glow-sm'
                        : 'bg-surfaceHover-dark text-[#8295B0] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-1.5 pl-1 border-l border-border-dark">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-4 h-4 rounded-full ${c.class} transition-transform ${
                      color === c.id ? 'scale-125 ring-2 ring-offset-1 ring-[#00B4FF] ring-offset-[#0B0F19]' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8295B0] hidden sm:inline">
                Ctrl+Enter
              </span>
              <button
                type="submit"
                disabled={!text.trim() && !title.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#00B4FF] hover:bg-[#38BDF8] disabled:opacity-40 disabled:cursor-not-allowed text-black shadow-glow transition-all active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Put It There</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Note Board Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-subtle-light dark:text-subtle-dark">
              Note Board ({notes.length})
            </h3>
          </div>

          {/* Search & Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3 h-3 text-subtle-light dark:text-subtle-dark absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-zinc-900 dark:text-zinc-100 placeholder:text-subtle-light/60 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Notes</option>
              <option value="pinned">Pinned Only</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed</option>
              <option value="Note">Notes 📝</option>
              <option value="Idea">Ideas 💡</option>
              <option value="Task">Tasks 📌</option>
              <option value="Study">Study 📚</option>
              <option value="Important">Important ⚡</option>
            </select>

            {/* Layout Switcher (2-Columns vs 1-Column vs Swipe Stream) */}
            <RubberSegment
              items={[
                { value: '2-col', label: '2-Col' },
                { value: '1-col', label: '1-Col' },
                { value: 'stream', label: 'Swipe Stream' }
              ]}
              value={columnLayout}
              onChange={(val) => setColumnLayout(val)}
              trackColor="#0A101F"
              thumbColor="#00B4FF"
              textColor="#8295B0"
              activeTextColor="#030712"
              size="sm"
              radius={8}
              inset={2}
            />
          </div>
        </div>

        {/* Notes Grid or Swipe Stream */}
        {filteredNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={notes.length === 0 ? 'No notes yet' : 'No notes match your filter'}
            description={
              notes.length === 0
                ? "Write your first note in the box above and click 'Put It There'!"
                : "Try clearing your search query or switching filters to see all notes."
            }
          />
        ) : columnLayout === 'stream' ? (
          <div className="space-y-2 max-w-3xl mx-auto">
            <div className="text-[11px] font-mono text-[#8295B0] flex items-center justify-between px-1 pb-1">
              <span>← Swipe row left to Pin or Full Swipe to Delete</span>
              <span>Tap row to open in Focus Reader</span>
            </div>
            {filteredNotes.map((note) => (
              <SwipeRow
                key={note.id}
                actions={[
                  { id: 'delete', label: 'Delete' },
                  {
                    id: 'pin',
                    label: note.isPinned ? 'Unpin' : 'Pin',
                    icon: <Pin className="w-4 h-4 text-white" fill={note.isPinned ? 'white' : 'none'} />,
                    color: '#0284c7',
                    dismiss: false,
                    onSelect: () => togglePinNote(note.id)
                  }
                ]}
                onCommit={() => deleteNote(note.id)}
                actionColor="#ef4444"
                drawerColor="#1A2744"
                rowColor="#0A101F"
                textColor="#F4F4F5"
                height={66}
                radius={14}
                style={{ marginBottom: 8 }}
              >
                <div
                  className="flex items-center justify-between w-full pr-2 cursor-pointer select-none"
                  onClick={() => setSelectedDrawerNote(note)}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLORS.find(c => c.id === note.color)?.class || 'bg-[#00B4FF]'}`} />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        {note.isPinned && <Pin className="w-3 h-3 text-[#00B4FF] fill-current shrink-0" />}
                        <span className={`text-xs sm:text-sm font-semibold truncate ${note.isDone ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                          {note.title || (note.text ? note.text.slice(0, 50) : 'Untitled Note')}
                        </span>
                      </div>
                      {note.title && note.text && (
                        <p className="text-[11px] text-[#8295B0] truncate max-w-md">
                          {note.text}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono text-[#8295B0] px-2 py-0.5 rounded-md bg-[#070D19] border border-[#1A2744]">
                      {note.tag}
                    </span>
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>
        ) : (
          <div className={`grid ${columnLayout === '2-col' ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1 gap-4 max-w-3xl mx-auto'} auto-rows-max items-start`}>
            {filteredNotes.map((note) => (
              <div key={note.id} className="min-w-0 max-w-full">
                <NoteCard
                  note={note}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onTogglePin={togglePinNote}
                  onToggleCheck={toggleCheckNote}
                  onOpenDrawer={setSelectedDrawerNote}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Slide-Over Reader & Focus Drawer */}
      <NoteDetailDrawer
        note={selectedDrawerNote}
        isOpen={Boolean(selectedDrawerNote)}
        onClose={() => setSelectedDrawerNote(null)}
        onUpdate={(noteId, patch) => {
          updateNote(noteId, patch);
          setSelectedDrawerNote(prev => (prev && prev.id === noteId ? { ...prev, ...patch } : prev));
        }}
        onDelete={(noteId) => {
          deleteNote(noteId);
          setSelectedDrawerNote(null);
        }}
        onTogglePin={(noteId) => {
          togglePinNote(noteId);
          setSelectedDrawerNote(prev => (prev && prev.id === noteId ? { ...prev, isPinned: !prev.isPinned } : prev));
        }}
        onToggleCheck={(noteId) => {
          toggleCheckNote(noteId);
          setSelectedDrawerNote(prev => (prev && prev.id === noteId ? { ...prev, isDone: !prev.isDone } : prev));
        }}
      />
    </div>
  );
}
