
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
      >
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="absolute left-1/2 top-[8vh] w-[min(880px,92vw)] -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-900">{title}</div>
              <div className="text-xs text-slate-500">Changes write directly to Google Sheets via Apps Script.</div>
            </div>
            <button onClick={onClose} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              <X className="h-4 w-4" /> Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-slate-200 px-5 py-4">{footer}</div> : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
