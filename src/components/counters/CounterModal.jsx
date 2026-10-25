import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useData } from '../../context/DataContext';

export function CounterModal({ isOpen, onClose, initialData = null }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData?.id ? 'Edit Counter' : 'New Counter'}>
      {/* Keyed remount instead of an effect: a fresh instance mounts each time the modal
          opens, so it always starts from the current initialData with no sync needed. */}
      {isOpen && (
        <CounterForm key={initialData?.id || 'new'} initialData={initialData} onClose={onClose} />
      )}
    </Modal>
  );
}

function CounterForm({ initialData, onClose }) {
  const { addCounter, updateCounter } = useData();
  const [name, setName] = useState(() => (typeof initialData === 'string' ? initialData : initialData?.name || ''));
  const [unit, setUnit] = useState(() => (typeof initialData === 'object' && initialData?.unit ? initialData.unit : 'count'));
  const [step, setStep] = useState(() => (typeof initialData === 'object' && initialData?.step ? initialData.step : 1));
  const [target, setTarget] = useState(() => (typeof initialData === 'object' && initialData?.target ? initialData.target : ''));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (initialData?.id) {
      updateCounter(initialData.id, {
        name: name.trim(),
        unit: unit.trim(),
        step: Number(step) || 1,
        target: target ? Number(target) : null
      });
    } else {
      addCounter({
        name: name.trim(),
        unit: unit.trim(),
        step: Number(step) || 1,
        target: target ? Number(target) : null
      });
    }
    onClose();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Counter Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DSA Problems, Coding Hours, Pages Read"
            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Unit
            </label>
            <input
              type="text"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="problems, hrs, pages"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Step
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={step}
              onChange={(e) => setStep(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Daily Target
            </label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            {initialData?.id ? 'Save Changes' : 'Create Counter'}
          </button>
        </div>
      </form>
    </>
  );
}
