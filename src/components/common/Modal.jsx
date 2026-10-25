import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Dialog */}
      <div className={`relative w-full ${maxWidth} bg-surface-light dark:bg-surface-dark rounded-2xl border-2 border-border-light dark:border-border-dark shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-border-light dark:border-border-dark">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-subtle-light dark:text-subtle-dark hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-surfaceHover-light dark:hover:bg-surfaceHover-dark transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
