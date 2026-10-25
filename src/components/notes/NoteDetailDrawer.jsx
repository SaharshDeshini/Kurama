import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { transformNoteWithAi } from '../../utils/aiWordService';
import { formatDistanceToNow, parseISO } from 'date-fns';
import SpringCheck from '../ui/SpringCheck';
import RubberSegment from '../ui/RubberSegment';
import {
  X,
  Pin,
  PinOff,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  Copy,
  Clock,
  Eye,
  Edit3,
  FileText,
  ListTodo,
  CheckCheck,
  Lightbulb
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Note', label: 'Note 📝' },
  { id: 'Idea', label: 'Idea 💡' },
  { id: 'Task', label: 'Task 📌' },
  { id: 'Study', label: 'Study 📚' },
  { id: 'Important', label: 'Important ⚡' },
];

const COLORS = [
  { id: 'blue', label: 'Blue', class: 'bg-[#00B4FF]' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-400' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-400' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-400' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-400' },
];

export function NoteDetailDrawer({
  note,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleCheck
}) {
  const { aiSettings = {} } = useData();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Note');
  const [color, setColor] = useState('blue');
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'preview'
  const [copied, setCopied] = useState(false);

  // AI Assistant state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setText(note.text || '');
      setTag(note.tag || 'Note');
      setColor(note.color || 'blue');
      setViewMode('edit');
    }
  }, [note]);

  if (!isOpen || !note) return null;

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    onUpdate(note.id, { title: newTitle });
  };

  const handleTextChange = (newText) => {
    setText(newText);
    onUpdate(note.id, { text: newText });
  };

  const handleTagChange = (newTag) => {
    setTag(newTag);
    onUpdate(note.id, { tag: newTag });
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    onUpdate(note.id, { color: newColor });
  };

  const handleCopy = () => {
    const full = [title, text].filter(Boolean).join('\n\n');
    navigator.clipboard?.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAiAction = async (action) => {
    if (!aiSettings?.apiKey) {
      setAiError('Configure your AI API key in Settings first.');
      setTimeout(() => setAiError(null), 3000);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const transformed = await transformNoteWithAi({
        action,
        noteText: text,
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey
      });

      if (transformed) {
        setText(transformed);
        onUpdate(note.id, { text: transformed });
      }
    } catch (err) {
      setAiError(err.message || 'AI transformation failed.');
      setTimeout(() => setAiError(null), 3500);
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleChecklistItem = (lineIndex) => {
    const lines = (text || '').split('\n');
    const target = lines[lineIndex];
    if (!target) return;

    if (target.includes('- [ ]')) {
      lines[lineIndex] = target.replace('- [ ]', '- [x]');
    } else if (target.includes('- [x]') || target.includes('- [X]')) {
      lines[lineIndex] = target.replace(/- \[[xX]\]/, '- [ ]');
    }

    const updated = lines.join('\n');
    setText(updated);
    onUpdate(note.id, { text: updated });
  };

  const wordsCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
  const charsCount = (text || '').length;

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(parseISO(note.createdAt), { addSuffix: true });
  } catch (e) {
    timeAgo = 'recently';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Slide-over Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-[#080E1C] border-l border-[#1A2744] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Top Header Bar */}
          <div className="p-5 border-b border-[#1A2744] flex items-center justify-between gap-3 bg-[#0B1325]/80">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category selector */}
              <div className="flex items-center gap-1 bg-[#070D19] border border-border-dark p-0.5 rounded-lg text-xs">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleTagChange(cat.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      tag === cat.id
                        ? 'bg-[#00B4FF] text-black shadow-glow-sm'
                        : 'text-[#8295B0] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Color dots */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-border-dark">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleColorChange(c.id)}
                    className={`w-3.5 h-3.5 rounded-full ${c.class} transition-transform ${
                      color === c.id ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* View / Actions / Close */}
            <div className="flex items-center gap-1.5">
              <RubberSegment
                items={[
                  { value: 'edit', label: 'Edit' },
                  { value: 'preview', label: 'Preview' }
                ]}
                value={viewMode}
                onChange={(val) => setViewMode(val)}
                trackColor="#0A101F"
                thumbColor="#00B4FF"
                textColor="#8295B0"
                activeTextColor="#030712"
                size="sm"
                radius={8}
                inset={2}
              />

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-white transition-colors"
                title="Copy note"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-white transition-colors ml-1"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Quick Transformation Toolbar */}
          <div className="px-6 py-2.5 bg-[#060A14] border-b border-[#1A2744] flex items-center gap-2 overflow-x-auto select-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00B4FF] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 fill-current" />
              AI Tools:
            </span>

            <button
              type="button"
              onClick={() => handleAiAction('polish')}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-300 hover:text-[#00B4FF] hover:border-[#00B4FF]/40 transition-all shrink-0"
            >
              <CheckCheck className="w-3 h-3 text-[#00B4FF]" />
              <span>Polish Text</span>
            </button>

            <button
              type="button"
              onClick={() => handleAiAction('actions')}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-300 hover:text-[#00B4FF] hover:border-[#00B4FF]/40 transition-all shrink-0"
            >
              <ListTodo className="w-3 h-3 text-[#00B4FF]" />
              <span>Make Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => handleAiAction('summarize')}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-300 hover:text-[#00B4FF] hover:border-[#00B4FF]/40 transition-all shrink-0"
            >
              <FileText className="w-3 h-3 text-[#00B4FF]" />
              <span>Summarize</span>
            </button>

            <button
              type="button"
              onClick={() => handleAiAction('expand')}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-border-dark bg-[#0A101F] text-zinc-300 hover:text-amber-400 hover:border-amber-500/40 transition-all shrink-0"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>Expand Idea</span>
            </button>

            {aiLoading && (
              <span className="flex items-center gap-1.5 text-xs text-[#00B4FF] animate-pulse ml-2 shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Transforming...
              </span>
            )}
          </div>

          {aiError && (
            <div className="mx-6 mt-3 p-2.5 rounded-lg bg-red-950/60 border border-red-900/60 text-xs text-red-300">
              {aiError}
            </div>
          )}

          {/* Drawer Body Editor / Preview */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note Title..."
              className="w-full text-2xl sm:text-3xl font-black tracking-tight text-white bg-transparent outline-none placeholder:text-zinc-700"
            />

            {viewMode === 'edit' ? (
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Start writing your thoughts, ideas, or markdown tasks here..."
                className="w-full h-[calc(100vh-340px)] text-sm sm:text-base text-zinc-200 bg-transparent outline-none resize-none font-sans leading-relaxed placeholder:text-zinc-700"
              />
            ) : (
              <div className="space-y-2 pt-2 text-zinc-200 text-sm sm:text-base leading-relaxed">
                {(text || '').split('\n').map((line, idx) => {
                  const match = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/);
                  if (match) {
                    const isChecked = match[1].toLowerCase() === 'x';
                    const itemText = match[2];
                    return (
                      <div key={idx} className="py-1">
                        <SpringCheck
                          label={itemText}
                          checked={isChecked}
                          onChange={() => handleToggleChecklistItem(idx)}
                          color="#F4F4F5"
                          fillColor="#00B4FF"
                          checkColor="#030712"
                          boxSize={20}
                          boxRadius={6}
                          fontSize={14}
                          bounce={0.2}
                          strikeLag={0.12}
                          strike="left"
                          className="w-full text-left"
                        />
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="min-h-[1.4rem]">
                      {line}
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer Status & Quick Actions */}
          <div className="p-4 sm:p-5 border-t border-[#1A2744] bg-[#070D19] flex items-center justify-between gap-3 text-xs text-[#8295B0]">
            <div className="flex items-center gap-3">
              <span className="font-mono">
                {wordsCount} words • {charsCount} chars
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#00B4FF]" />
                {timeAgo}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTogglePin(note.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  note.isPinned
                    ? 'border-[#00B4FF] bg-[#00B4FF]/15 text-[#00B4FF]'
                    : 'border-border-dark text-[#8295B0] hover:text-white'
                }`}
              >
                {note.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                <span>{note.isPinned ? 'Pinned' : 'Pin'}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleCheck(note.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  note.isDone
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-border-dark text-[#8295B0] hover:text-white'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>{note.isDone ? 'Completed' : 'Mark Done'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete(note.id);
                  onClose();
                }}
                className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-red-400 hover:border-red-900/60 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
