import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { getTodayDateString } from '../../utils/dates';
import { getDaysSinceBackup, isBackupStale } from '../../utils/backup';
import { Sun, Moon, Monitor, Download, Upload, Trash2, Check, AlertTriangle, RefreshCw, Sparkles, Key, Eye, EyeOff, ExternalLink, Loader2, Cloud } from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { testAiConnection } from '../../utils/aiWordService';

export function SettingsModal({ isOpen, onClose, onOpenAuth }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="max-w-lg">
      {isOpen && <SettingsForm onOpenAuth={onOpenAuth} onCloseParent={onClose} />}
    </Modal>
  );
}

function SettingsForm({ onOpenAuth, onCloseParent }) {
  const {
    settings,
    updateSettings,
    currentUser,
    isSyncing,
    lastSyncedAt,
    syncWithCloud,
    aiSettings = { provider: 'gemini', apiKey: '', level: 'advanced' },
    updateAiSettings,
    exportData,
    importData,
    clearAllData,
    loadDemoData,
    recordBackup
  } = useData();

  const [userName, setUserName] = useState(settings?.userName || '');
  const [motto, setMotto] = useState(settings?.motto || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // AI Settings state
  const [aiProvider, setAiProvider] = useState(aiSettings.provider || 'gemini');
  const [aiKey, setAiKey] = useState(aiSettings.apiKey || '');
  const [aiLevel, setAiLevel] = useState(aiSettings.level || 'advanced');
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isLoadDemoOpen, setIsLoadDemoOpen] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const fileInputRef = useRef(null);

  const daysSinceBackup = getDaysSinceBackup(settings.lastBackupAt);
  const backupIsStale = isBackupStale(settings.lastBackupAt);
  const backupStatusText = daysSinceBackup === null
    ? "You haven't exported a backup yet."
    : daysSinceBackup === 0
      ? 'Backed up today.'
      : `Last backup ${daysSinceBackup} day${daysSinceBackup === 1 ? '' : 's'} ago.`;

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateSettings({
      userName: userName.trim(),
      motto: motto.trim()
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleExport = () => {
    const data = exportData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `personal-os-backup-${getTodayDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    recordBackup();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        importData(parsed);
        setImportStatus({ success: true, message: 'Data successfully restored!' });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ success: false, message: 'Failed to import JSON: Invalid format' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      {/* Account & Supabase Cloud Sync Card */}
      <div className="p-4 rounded-xl border border-border-dark bg-[#0A101F] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              currentUser
                ? 'bg-[#00B4FF] text-black shadow-glow-sm'
                : 'bg-surface-dark text-zinc-400 border border-border-dark'
            }`}>
              {currentUser?.email ? currentUser.email[0].toUpperCase() : <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentUser ? 'Supabase Account' : 'Local Guest Account'}</span>
                {currentUser && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <div className="text-[11px] text-[#8295B0]">
                {currentUser ? currentUser.email : 'Not logged in • Saved in this browser only'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onCloseParent) onCloseParent();
              if (onOpenAuth) onOpenAuth();
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow-sm"
          >
            {currentUser ? 'Manage Account' : 'Sign In ☁️'}
          </button>
        </div>

        {currentUser && (
          <div className="pt-2.5 border-t border-[#1A2744] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#8295B0] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Full Cross-Device Sync Active</span>
              {lastSyncedAt && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  • {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => syncWithCloud()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#00B4FF]/20 text-[#00B4FF] hover:bg-[#00B4FF]/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Appearance Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          Appearance
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => updateSettings({ theme: id })}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                settings?.theme === id
                  ? 'border-ember bg-ember/10 text-ember'
                  : 'border-border-light dark:border-border-dark text-subtle-light dark:text-subtle-dark hover:border-ember/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Personal Info Settings */}
      <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          Personal Details
        </h3>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Alex, Sam (optional)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Daily Motto
            </label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g. Focus on what matters."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-ember text-white hover:bg-ember-dark transition-colors shadow-glow-sm"
            >
              Save Details
            </button>
            {profileSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* AI Vocabulary Assistant Settings */}
      <div className="space-y-3 pt-4 border-t border-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-ember/15 text-ember border border-ember/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
                AI Vocabulary Assistant
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-ember/20 text-ember border border-ember/30">
                  Daily English
                </span>
              </h3>
              <p className="text-[11px] text-subtle-dark">
                Connect your API key to generate new articulate words, definitions, and idioms on demand.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border-dark bg-card-dark space-y-3">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              AI Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'gemini', name: 'Google Gemini', desc: 'Gemini 2.0 / 1.5 Flash' },
                { id: 'claude', name: 'Anthropic Claude', desc: 'Claude 3.5 / 3.7' },
                { id: 'groq', name: 'Groq Cloud', desc: 'Free LLaMA 3.3 70B' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & 4o-mini' },
                { id: 'openrouter', name: 'OpenRouter', desc: 'Free & Custom Models' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setAiProvider(p.id);
                    setTestResult(null);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === p.id
                      ? 'border-ember bg-ember/15 text-zinc-100 shadow-glow-sm'
                      : 'border-border-dark bg-surface-dark text-subtle-dark hover:border-ember/40 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>{p.name}</span>
                    {aiProvider === p.id && <Check className="w-3 h-3 text-ember" />}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-ember" />
                <span>API Key</span>
              </label>
              {aiProvider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ember hover:underline inline-flex items-center gap-0.5"
                >
                  Get free Gemini key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {aiProvider === 'claude' && (
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ember hover:underline inline-flex items-center gap-0.5"
                >
                  Get Claude key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {aiProvider === 'groq' && (
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ember hover:underline inline-flex items-center gap-0.5"
                >
                  Get free Groq key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {aiProvider === 'openai' && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ember hover:underline inline-flex items-center gap-0.5"
                >
                  Get OpenAI key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {aiProvider === 'openrouter' && (
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ember hover:underline inline-flex items-center gap-0.5"
                >
                  Get OpenRouter key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={aiKey}
                onChange={(e) => {
                  setAiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={
                  aiProvider === 'gemini' ? 'AIzaSy...' :
                  aiProvider === 'claude' ? 'sk-ant-api03-...' :
                  aiProvider === 'groq' ? 'gsk_...' :
                  aiProvider === 'openai' ? 'sk-...' : 'sk-or-v1-...'
                }
                className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-border-dark bg-surface-dark text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-ember focus:ring-1 focus:ring-ember font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Your key is saved locally in this browser only and is never transmitted to any secondary servers.
            </p>
          </div>

          {/* Level Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Target Vocabulary Level
            </label>
            <select
              value={aiLevel}
              onChange={(e) => setAiLevel(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border-dark bg-surface-dark text-zinc-100 focus:outline-hidden focus:border-ember"
            >
              <option value="advanced">Advanced & Eloquent (GRE / SAT level)</option>
              <option value="professional">Professional & Business Articulate</option>
              <option value="literary">Literary, Poetic & Evocative</option>
              <option value="intermediate">Practical & Everyday Nuanced</option>
            </select>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950/40 text-red-300 border border-red-800'
              }`}
            >
              {testResult.success ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
              )}
              <span className="leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={testingKey}
              onClick={async () => {
                if (!aiKey.trim()) {
                  setTestResult({ success: false, message: 'Please paste your API key first.' });
                  return;
                }
                setTestingKey(true);
                setTestResult(null);
                try {
                  await testAiConnection({ provider: aiProvider, apiKey: aiKey.trim() });
                  updateAiSettings({
                    provider: aiProvider,
                    apiKey: aiKey.trim(),
                    level: aiLevel
                  });
                  setTestResult({ success: true, message: 'Connection successful! Key saved and verified.' });
                } catch (err) {
                  setTestResult({ success: false, message: err.message || 'Connection test failed.' });
                } finally {
                  setTestingKey(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-ember text-white hover:bg-ember-light transition-all shadow-glow-sm disabled:opacity-50"
            >
              {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{testingKey ? 'Testing Connection...' : 'Save & Test API Key'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                updateAiSettings({
                  provider: aiProvider,
                  apiKey: aiKey.trim(),
                  level: aiLevel
                });
                setTestResult({ success: true, message: 'Settings saved.' });
                setTimeout(() => setTestResult(null), 2500);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border-dark text-zinc-300 hover:bg-surface-dark transition-colors"
            >
              Save Without Testing
            </button>
          </div>
        </div>
      </div>

      {/* Data Management: Export / Import / Clear */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Local Data & Backups
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Your data is stored 100% locally in this browser. Export regularly to keep backups or move to another machine.
          </p>
          <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${backupIsStale ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {backupIsStale ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
            <span>{backupStatusText}</span>
          </p>
        </div>

        {importStatus && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            importStatus.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              if (onCloseParent) onCloseParent();
              if (onOpenAuth) onOpenAuth();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#00B4FF] text-black hover:bg-[#38BDF8] active:scale-95 transition-all shadow-glow-sm"
          >
            <Cloud className="w-3.5 h-3.5 fill-black" />
            <span>Supabase Cloud Sync & Account</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export My Data (JSON)</span>
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLoadDemoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Example Data</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={clearAllData}
        title="Clear All Data?"
        message="This will permanently erase all challenges, counters, and journal entries from your browser's local storage. This action cannot be undone."
        confirmText="Yes, Erase Everything"
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={isLoadDemoOpen}
        onClose={() => setIsLoadDemoOpen(false)}
        onConfirm={loadDemoData}
        title="Load Example Data?"
        message="This will populate your dashboard with a sample challenge and counters so you can explore Kurama."
        confirmText="Load Example Data"
      />
    </div>
  );
}
