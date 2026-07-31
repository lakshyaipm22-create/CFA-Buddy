'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-[#00843D]" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-400" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-[#C5A258]" />}
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="ml-2" style={{ color: 'var(--foreground-secondary)' }}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
