"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: number; message: string };
const ToastContext = createContext<((message: string) => void) | null>(null);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const notify = useCallback((message: string) => {
    if (!message.trim()) return;
    const toast = { id: ++nextId.current, message };
    setToasts(current => [...current.slice(-2), toast]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts(current => current.filter(toast => toast.id !== id)), []);

  return <ToastContext.Provider value={notify}>
    {children}
    <div aria-label="Notifications" className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex flex-col gap-3 sm:left-auto sm:right-5 sm:w-96">
      <AnimatePresence initial={false}>
        {toasts.map(toast => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </AnimatePresence>
    </div>
  </ToastContext.Provider>;
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, dismiss]);

  return <motion.div layout={!reducedMotion}
    initial={{ opacity: 0, y: reducedMotion ? 0 : -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : 24 }} transition={{ duration: reducedMotion ? 0 : .2 }}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-gray-100 border-l-4 border-l-[#65D900] bg-white p-4 text-gray-900 shadow-xl shadow-black/10">
    <CheckCircle2 size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-[#438F00]" />
    <p role="status" aria-atomic="true" className="min-w-0 flex-1 break-words text-sm font-medium leading-6">{toast.message}</p>
    <button type="button" aria-label="Fermer la notification" onClick={() => dismiss(toast.id)} className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#65D900]"><X size={17} aria-hidden="true" /></button>
  </motion.div>;
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("ToastProvider est requis.");
  return notify;
}
