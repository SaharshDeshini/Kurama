import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Copy,
  Check,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  Loader2,
  CheckCheck,
  ListTodo,
  FileText,
  Lightbulb,
  Maximize2
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { transformNoteWithAi } from '../../utils/aiWordService';
import SpringCheck from '../ui/SpringCheck';

const COLOR_ACCENTS = {
  blue: {
    borderHover: 'hover:border-[#00B4FF]/50',
    accentBar: 'bg-[#00B4FF]',
    accentText: 'text-[#00B4FF]',
    badgeBg: 'bg-blue-950/60 text-[#38BDF8] border border-[#00B4FF]/30',
  },
  indigo: {
    borderHover: 'hover:border-indigo-500/50',
    accentBar: 'bg-indigo-500',
    accentText: 'text-indigo-400',
    badgeBg: 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40',
  },
  cyan: {
    borderHover: 'hover:border-cyan-500/50',
    accentBar: 'bg-cyan-400',
    accentText: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40',
  },
  emerald: {
    borderHover: 'hover:border-emerald-500/50',
    accentBar: 'bg-emerald-400',
    accentText: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40',
  },
  amber: {
    borderHover: 'hover:border-amber-500/50',
    accentBar: 'bg-amber-400',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300 border border-amber-800/40',
  },
  purple: {
    borderHover: 'hover:border-purple-500/50',
    accentBar: 'bg-purple-400',
    accentText: 'text-purple-400',
    badgeBg: 'bg-purple-950/60 text-purple-300 border border-purple-800/40',
  }
};

export function NoteCard({ note, onUpdate, onDelete, onTogglePin, onToggleCheck, onOpenDrawer }) {
  const { aiSettings = {} } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [editTitle, setEditTitle] = useState(note.title || '');
  const [copied, setCopied] = useState(false);

  // AI Assistant menu state
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const theme = COLOR_ACCENTS[note.color] || COLOR_ACCENTS.blue;

  const handleSave = () => {
    if (!editText.trim() && !editTitle.trim()) {
      onDelete(note.id);
      return;
    }
    onUpdate(note.id, {
      title: editTitle.trim(),
      text: editText.trim()
    });
    setIsEditing(false);
  };

  const handleCopy = () => {
    const fullContent = [note.title, note.text].filter(Boolean).join('\n\n');
    navigator.clipboard?.writeText(fullContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleAiAction = async (action) => {
    if (!aiSettings?.apiKey) {
      setAiError('Please configure your AI API key in Settings first.');
      setTimeout(() => setAiError(null), 3000);
      return;
    }

    setShowAiMenu(false);
    setAiLoading(true);
    setAiError(null);

    try {
      const transformed = await transformNoteWithAi({
        action,
        noteText: note.text,
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey
      });

      if (transformed) {
        onUpdate(note.id, { text: transformed });
      }
    } catch (err) {
      setAiError(err.message || 'AI action failed');
      setTimeout(() => setAiError(null), 3500);
    } finally {
      setAiLoading(false);
    }
  };

  // Toggle individual checklist item inside note text
  const handleToggleChecklistItem = (lineIndex) => {
    const lines = (note.text || '').split('\n');
    const targetLine = lines[lineIndex];
    if (!targetLine) return;

    if (targetLine.includes('- [ ]')) {
      lines[lineIndex] = targetLine.replace('- [ ]', '- [x]');
    } else if (targetLine.includes('- [x]') || targetLine.includes('- [X]')) {
      lines[lineIndex] = targetLine.replace(/- \[[xX]\]/, '- [ ]');
    }

    onUpdate(note.id, { text: lines.join('\n') });
  };

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(parseISO(note.createdAt), { addSuffix: true });
  } catch (e) {
    timeAgo = 'recently';
  }

  // Render text with interactive checklist support
  const renderNoteContent = () => {
    const lines = (note.text || '').split('\n');
    const hasChecklist = lines.some(l => /^\s*[-*]\s*\[([ xX])\]/.test(l));

    if (!hasChecklist) {
      return (
        <p className={`text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] max-w-full font-normal ${note.isDone ? 'line-through text-zinc-500' : ''}`}>
          {note.text}
        </p>
      );
    }

    return (
      <div className="space-y-1.5 min-w-0 max-w-full">
        {lines.map((line, idx) => {
          const match = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/);
          if (match) {
            const isChecked = match[1].toLowerCase() === 'x';
            const itemText = match[2];
            return (
              <div key={idx} className="py-0.5 min-w-0 max-w-full">
                <SpringCheck
                  label={itemText}
                  checked={isChecked}
                  onChange={() => handleToggleChecklistItem(idx)}
                  color="#E4E4E7"
                  fillColor="#00B4FF"
                  checkColor="#030712"
                  boxSize={18}
                  boxRadius={5}
                  fontSize={13}
                  bounce={0.2}
                  strikeLag={0.12}
                  strike="left"
                  className="w-full text-left"
                />
              </div>
            );
          }
          return (
            <p key={idx} className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words [overflow-wrap:anywhere]">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`group relative rounded-2xl border bg-[#0B1220] p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] ${
        note.isPinned
          ? 'border-[#00B4FF]/60 shadow-glow-sm ring-1 ring-[#00B4FF]/30'
          : `border-[#1A2744] ${theme.borderHover}`
      } ${note.isDone ? 'opacity-65' : ''}`}
    >
      {/* Sleek Left Color Accent Bar */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${theme.accentBar} opacity-80`} />

      <div className="min-w-0 max-w-full pl-1">
        {/* Top Header: Tag, Pin & Clean Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.tag && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${theme.badgeBg}`}>
                {note.tag}
              </span>
            )}
            {note.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00B4FF] bg-blue-950/70 border border-[#00B4FF]/40 px-2 py-0.5 rounded-lg shadow-glow-sm">
                <Pin className="w-2.5 h-2.5 fill-current" />
                Pinned
              </span>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1">
            {/* AI Note Assistant */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={aiLoading}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#00B4FF] bg-[#00B4FF]/10 hover:bg-[#00B4FF]/20 border border-[#00B4FF]/30 transition-all shadow-glow-sm"
                title="AI Note Assistant (Polish, Checklists, Summarize)"
              >
                {aiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 fill-[#00B4FF]" />
                )}
                <span className="hidden sm:inline">AI</span>
              </button>

              {/* AI Dropdown Menu */}
              {showAiMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border-dark bg-[#0A101F] shadow-2xl py-1.5 z-40 space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8295B0] border-b border-border-dark">
                    AI Note Assistant
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAiAction('polish')}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-[#00B4FF]/15 hover:text-[#00B4FF] flex items-center gap-2"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-[#00B4FF]" />
                    <span>Polish & Refine</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('actions')}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-[#00B4FF]/15 hover:text-[#00B4FF] flex items-center gap-2"
                  >
                    <ListTodo className="w-3.5 h-3.5 text-[#00B4FF]" />
                    <span>Turn into Checklist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('summarize')}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-[#00B4FF]/15 hover:text-[#00B4FF] flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#00B4FF]" />
                    <span>Summarize in Bullets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('expand')}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-200 hover:bg-[#00B4FF]/15 hover:text-[#00B4FF] flex items-center gap-2"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expand Idea</span>
                  </button>
                </div>
              )}
            </div>

            {/* Check/Done toggle */}
            <button
              type="button"
              onClick={() => onToggleCheck(note.id)}
              className={`p-1.5 rounded-lg border transition-all ${
                note.isDone
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
                  : 'border-border-dark text-[#8295B0] hover:text-white hover:bg-surface-dark'
              }`}
              title={note.isDone ? 'Mark as active' : 'Mark as completed'}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => onTogglePin(note.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                note.isPinned
                  ? 'border-[#00B4FF] text-[#00B4FF] bg-[#00B4FF]/15'
                  : 'border-border-dark text-[#8295B0] hover:text-white hover:bg-surface-dark'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
            >
              {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>

            {/* Full Focus Drawer Reader */}
            {onOpenDrawer && (
              <button
                type="button"
                onClick={() => onOpenDrawer(note)}
                className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-[#00B4FF] hover:border-[#00B4FF]/40 hover:bg-[#00B4FF]/10 transition-colors"
                title="Expand & focus in reader drawer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Edit */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-white hover:bg-surface-dark transition-colors"
              title="Edit note"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              className="p-1.5 rounded-lg border border-border-dark text-[#8295B0] hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/30 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Error Notification */}
        {aiError && (
          <div className="mb-2 p-2 rounded-lg bg-red-950/60 border border-red-900/60 text-[11px] text-red-300">
            {aiError}
          </div>
        )}

        {/* Note Content / Editing */}
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
            />
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              placeholder="Note content..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-border-dark bg-[#0A101F] text-zinc-100 focus:outline-hidden focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF] resize-none font-sans"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-[#8295B0] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] transition-colors shadow-glow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
            {note.title && (
              <h4 className={`text-base font-bold tracking-tight text-white break-words [overflow-wrap:anywhere] max-w-full ${note.isDone ? 'line-through text-zinc-500' : ''}`}>
                {note.title}
              </h4>
            )}
            {renderNoteContent()}
          </div>
        )}
      </div>

      {/* Footer: timestamp & quick copy */}
      <div className="mt-4 pt-3 border-t border-[#1A2744] flex items-center justify-between text-[11px] text-[#8295B0] pl-1">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#00B4FF]" />
          {timeAgo}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8295B0] hover:text-white transition-colors"
          title="Copy note text"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
