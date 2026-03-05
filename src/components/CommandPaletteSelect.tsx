
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function CommandPaletteSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  maxItems = 300,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; sub?: string }>;
  placeholder?: string;
  label?: string;
  maxItems?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const current = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(t));
  }, [options, q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [q]);

  function choose(idx: number) {
    const item = filtered[idx];
    if (!item) return;
    onChange(item.value);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-white/80 px-3 py-2 text-left text-sm text-slate-900 ring-1 ring-slate-200/70 transition-all hover:ring-slate-300"
      >
        <span className="min-w-0">
          <span className={cn(!value && "text-slate-400")}>
            {current ? current.label : placeholder ?? "Select"}
          </span>
          {current?.sub ? (
            <span className="ml-2 hidden truncate text-xs text-slate-500 sm:inline">
              {current.sub}
            </span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <span className="hidden sm:inline">⌘K</span>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute left-1/2 top-[10vh] w-[min(720px,92vw)] -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
            >
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Search className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label ?? "Select"}</div>
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setOpen(false);
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(i - 1, 0));
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        choose(activeIndex);
                      }
                    }}
                    placeholder={placeholder ?? "Type to search…"}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" /> Close
                </button>
              </div>

              <div className="max-h-[60vh] overflow-auto p-2">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl p-6 text-sm text-slate-600">No matches. Try a different search.</div>
                ) : (
                  filtered.slice(0, maxItems).map((o, idx) => (
                    <button
                      key={o.value}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => choose(idx)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
                        idx === activeIndex ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{o.label}</div>
                        {o.sub ? <div className={cn("truncate text-xs", idx === activeIndex ? "text-white/80" : "text-slate-500")}>{o.sub}</div> : null}
                      </div>
                      <span className={cn("text-xs", idx === activeIndex ? "text-white/70" : "text-slate-400")}>Enter</span>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Use ↑ ↓ to navigate, Enter to select, Esc to close.</span>
                <span className="hidden sm:inline">Fastest: type class code + Enter.</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
