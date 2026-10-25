import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from '../common/Modal';
import { Plus, Trash2, Calendar, Target, Infinity as InfinityIcon, CheckSquare, Hash } from 'lucide-react';
import { getTodayDateString } from '../../utils/dates';

export function ChallengeModal({ isOpen, onClose, initialTemplate = null }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Challenge" maxWidth="max-w-lg">
      {/* Keyed remount instead of an effect: a fresh instance mounts each time the modal
          opens (or a different template is selected), so the form always starts from the
          current template with no sync needed. */}
      {isOpen && <ChallengeForm key={initialTemplate?.name || 'blank'} onClose={onClose} initialTemplate={initialTemplate} />}
    </Modal>
  );
}

function ChallengeForm({ onClose, initialTemplate }) {
  const { addChallenge } = useData();

  const [name, setName] = useState(initialTemplate?.name || '');
  const [durationType, setDurationType] = useState('fixed');
  const [duration, setDuration] = useState(String(initialTemplate?.duration || '30'));
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [requirements, setRequirements] = useState(() =>
    initialTemplate?.dailyRequirements?.length
      ? initialTemplate.dailyRequirements.map((r, idx) => ({ id: `tmpl_${idx}`, title: r.title, type: 'checkbox', target: '', unit: '' }))
      : [{ id: '1', title: '', type: 'checkbox', target: '', unit: '' }]
  );

  const handleAddRequirement = () => {
    setRequirements(prev => [...prev, { id: Date.now().toString(), title: '', type: 'checkbox', target: '', unit: '' }]);
  };

  const handleUpdateRequirement = (id, field, value) => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveRequirement = (id) => {
    if (requirements.length === 1) return;
    setRequirements(prev => prev.filter(r => r.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validRequirements = requirements.filter(r => r.title.trim() !== '');
    if (validRequirements.length === 0) return;
    if (validRequirements.some(r => r.type === 'counter' && !String(r.target).trim())) return;

    addChallenge({
      name,
      durationType,
      duration,
      startDate,
      dailyRequirements: validRequirements
    });

    onClose();
  };

  const isSubmitDisabled = !name.trim() ||
    !requirements.some(r => r.title.trim()) ||
    requirements.some(r => r.title.trim() && r.type === 'counter' && !String(r.target).trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Challenge Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 120 Day Discipline"
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            How long does this run?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDurationType('fixed')}
              className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                durationType === 'fixed'
                  ? 'border-ember bg-ember/10 text-ember'
                  : 'border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:border-ember/40'
              }`}
            >
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>Set a day target</span>
            </button>
            <button
              type="button"
              onClick={() => setDurationType('open')}
              className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                durationType === 'open'
                  ? 'border-ember bg-ember/10 text-ember'
                  : 'border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:border-ember/40'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Just keep going</span>
            </button>
          </div>
          {durationType === 'open' && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              No end date — you just build as many consecutive days as possible.
            </p>
          )}
        </div>

        <div className={`grid gap-4 ${durationType === 'fixed' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
              />
            </div>
          </div>
          {durationType === 'fixed' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Duration (Days)
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Daily Requirements
        </label>
        <div className="space-y-2.5 mb-3">
          {requirements.map((req) => (
            <div key={req.id} className="p-2.5 rounded-lg border-2 border-border-light dark:border-border-dark space-y-2">
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  value={req.title}
                  onChange={(e) => handleUpdateRequirement(req.id, 'title', e.target.value)}
                  placeholder="e.g., Study DSA"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(req.id)}
                  disabled={requirements.length === 1}
                  className="p-2 shrink-0 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/70 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateRequirement(req.id, 'type', 'checkbox')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                      req.type !== 'counter' ? 'bg-ok text-white' : 'text-subtle-light dark:text-subtle-dark'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" /> Tick
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateRequirement(req.id, 'type', 'counter')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                      req.type === 'counter' ? 'bg-ember text-white' : 'text-subtle-light dark:text-subtle-dark'
                    }`}
                  >
                    <Hash className="w-3 h-3" /> Counter
                  </button>
                </div>

                {req.type === 'counter' && (
                  <>
                    <input
                      type="number"
                      min="1"
                      value={req.target}
                      onChange={(e) => handleUpdateRequirement(req.id, 'target', e.target.value)}
                      placeholder="Target (e.g. 7)"
                      className="w-28 px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                    />
                    <input
                      type="text"
                      value={req.unit}
                      onChange={(e) => handleUpdateRequirement(req.id, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-24 px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#141618] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700/50"
        >
          <Plus className="w-3 h-3" /> Add Requirement
        </button>
      </div>

      <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-ember text-white hover:bg-ember-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Challenge
        </button>
      </div>
    </form>
  );
}
