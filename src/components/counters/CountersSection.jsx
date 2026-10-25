import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { getTodayDateString } from '../../utils/dates';
import { calculateCounterTotals, getCounterChartData, getTimeOfDayDistribution, flattenCompletionTimestamps } from '../../utils/statistics';
import { CounterModal } from './CounterModal';
import { CounterChart } from './CounterChart';
import { TimeOfDayHeatmap } from '../common/TimeOfDayHeatmap';
import { Plus, Edit2, Trash2, TrendingUp, Clock } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function CountersSection() {
  const { counters, counterEntries, counterCompletionTimes, setCounterValue, deleteCounter } = useData();
  const todayStr = getTodayDateString();

  const [selectedCounterId, setSelectedCounterId] = useState(counters[0]?.id || null);
  const [logDate, setLogDate] = useState(todayStr);
  const [logValue, setLogValue] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeCounterId = selectedCounterId || counters[0]?.id;
  const activeCounter = counters.find(c => c.id === activeCounterId);

  const chartData = activeCounter
    ? getCounterChartData(activeCounter.id, counterEntries, 14)
    : [];

  const timeOfDayData = activeCounter
    ? getTimeOfDayDistribution(flattenCompletionTimestamps(counterCompletionTimes, activeCounter.id))
    : [];

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!activeCounterId || logValue === '') return;
    setCounterValue(activeCounterId, logValue, logDate);
    setLogValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Track Numbers
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Log custom metrics by date: problems solved, hours coded, pages read.
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setEditingCounter(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Counter</span>
        </button>
      </div>

      {counters.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {counters.map(counter => {
              const totals = calculateCounterTotals(counter.id, counterEntries);
              const isSelected = counter.id === activeCounterId;

              return (
                <div
                  key={counter.id}
                  onClick={() => setSelectedCounterId(counter.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-[#141618] ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-xs'
                      : 'border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#141618] hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {counter.name}
                    </h3>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setEditingCounter(counter); setIsModalOpen(true); }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(counter)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Today:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{totals.today} {counter.unit}</strong>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>This week:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{totals.week} {counter.unit}</strong>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>This month:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{totals.month} {counter.unit}</strong>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span>Overall:</span>
                      <strong className="font-mono text-zinc-900 dark:text-zinc-100">{totals.overall} {counter.unit}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeCounter && (
            <div className="bg-white dark:bg-[#141618] rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 p-5 transition-surface space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    14-Day History: {activeCounter.name} ({activeCounter.unit})
                  </h3>
                </div>

                <form onSubmit={handleLogSubmit} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={`Value (${activeCounter.unit})`}
                    value={logValue}
                    onChange={(e) => setLogValue(e.target.value)}
                    className="w-24 px-2 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white"
                  >
                    Set
                  </button>
                </form>
              </div>

              <CounterChart
                data={chartData}
                counterName={activeCounter.name}
                unit={activeCounter.unit}
              />

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    When you log this
                  </h4>
                </div>
                <TimeOfDayHeatmap data={timeOfDayData} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No counters created yet"
          description="Track things that matter in numbers: problems, hours, pages, or sets."
          actionText="+ New Counter"
          onAction={() => { setEditingCounter(null); setIsModalOpen(true); }}
        />
      )}

      <CounterModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCounter(null); }}
        initialData={editingCounter}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteCounter(deleteTarget.id)}
        title="Delete Counter"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All historical recorded numbers for this counter will be deleted.`}
        confirmText="Delete Counter"
        isDestructive={true}
      />
    </div>
  );
}
