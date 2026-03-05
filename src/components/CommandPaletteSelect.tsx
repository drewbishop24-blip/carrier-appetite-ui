
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

type Option = { value: string; label: string; sub?: string };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function useOnClickOutside(refs: Array<React.RefObject<HTMLElement>>, onOutside: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      const inside = refs.some((r) => r.current && r.current.contains(t));
      if (!inside) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, onOutside, refs]);
}

export function CommandPaletteSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => options.find((o) => o.value === value) || null, [options, value]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options.slice(0, 250);
    return options
      .filter((o) => (o.label + " " + (o.sub || "") + " " + o.value).toLowerCase().includes(s))
      .slice(0, 250);
  }, [options, q]);

  useOnClickOutside([triggerRef as any, panelRef as any], () => setOpen(false), open);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      // Cmd/Ctrl+K opens
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const panel = (() => {
    if (!open || !triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom + 10;
    const width = rect.width;

    return createPortal(
      <div
        ref={panelRef}
        className="fixed z-[10000]"
        style={{ left, top, width }}
      >
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_120px_rgba(15,23,42,0.28)] ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder || "Search…"}
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <div className="text-[10px] font-semibold text-slate-400">ESC</div>
          </div>

          <div className="max-h-[320px] overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">No results</div>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-2 text-left transition",
                      active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                    )}
                  >
                    <div className="min-w-0">
                      <div className={cn("truncate text-sm font-semibold", active ? "text-white" : "text-slate-900")}>{opt.label}</div>
                      {opt.sub ? <div className={cn("truncate text-xs", active ? "text-white/70" : "text-slate-500")}>{opt.sub}</div> : null}
                    </div>
                    {active ? <Check className="mt-0.5 h-4 w-4" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  })();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-left ring-1 ring-slate-200 hover:bg-slate-50"
        aria-label={label || "Select"}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {selected ? selected.label : <span className="text-slate-400">{placeholder || "Select…"}</span>}
          </div>
          {selected?.sub ? <div className="truncate text-xs text-slate-500">{selected.sub}</div> : null}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", open ? "rotate-180" : "group-hover:text-slate-600")} />
      </button>
      {panel}
    </>
  );
}
