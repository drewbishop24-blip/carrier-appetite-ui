
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BadgeCheck, Building2, ExternalLink, KeyRound, LayoutGrid, Search, Settings2, ShieldAlert, X } from "lucide-react";
import { CommandPaletteSelect } from "./components/CommandPaletteSelect";
import { Appetite, apiDeleteMapping, apiGetCarriers, apiGetClassCodes, apiGetMapping, apiSearchByClassCode, apiUpsertMapping, CarrierRow, ClassCodeRow, SearchResult } from "./lib/api";

function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

function Pill({ tone, children }: { tone: "emerald" | "amber" | "rose" | "slate"; children: React.ReactNode; }) {
  const styles = tone === "emerald" ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-600/25"
    : tone === "amber" ? "bg-amber-500/15 text-amber-800 ring-1 ring-amber-600/25"
    : tone === "rose" ? "bg-rose-500/15 text-rose-800 ring-1 ring-rose-600/25"
    : "bg-slate-500/15 text-slate-700 ring-1 ring-slate-600/25";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", styles)}>{children}</span>;
}

function AppetiteBadge({ appetite }: { appetite: Appetite }) {
  if (appetite === "Write") return <Pill tone="emerald"><BadgeCheck className="h-3.5 w-3.5" /> Write</Pill>;
  if (appetite === "Maybe") return <Pill tone="amber"><AlertTriangle className="h-3.5 w-3.5" /> Maybe</Pill>;
  return <Pill tone="rose"><X className="h-3.5 w-3.5" /> No</Pill>;
}

function formatWebsite(url?: string) {
  if (!url) return "";
  try { const u = new URL(url); return u.hostname.replace(/^www\./,""); } catch { return url; }
}

function sortResults(results: SearchResult[]) {
  const appetiteRank = (a: Appetite) => (a === "Write" ? 0 : a === "Maybe" ? 1 : 2);
  return [...results].sort((x, y) => {
    const px = Number(x.mapping.Priority ?? 9999);
    const py = Number(y.mapping.Priority ?? 9999);
    if (px !== py) return px - py;
    const ax = appetiteRank(x.mapping.Appetite);
    const ay = appetiteRank(y.mapping.Appetite);
    if (ax !== ay) return ax - ay;
    return (x.carrier.CarrierName || x.carrier.CarrierID).localeCompare(y.carrier.CarrierName || y.carrier.CarrierID);
  });
}

function Toast({ message, tone, onClose }: { message: string; tone: "ok" | "warn" | "err"; onClose: () => void }) {
  const styles = tone === "ok" ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/30"
    : tone === "warn" ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30"
    : "bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/30";
  const Icon = tone === "ok" ? BadgeCheck : tone === "warn" ? AlertTriangle : ShieldAlert;
  return (
    <AnimatePresence>
      {message ? (
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
          className={cn("fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-3 text-sm shadow-soft backdrop-blur-xl", styles)}>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="max-w-[78vw] sm:max-w-[520px]">{message}</span>
            <button onClick={onClose} className="ml-2 rounded-xl p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function App() {
  const [mode, setMode] = useState<"search"|"admin">("search");
  const [classCodes, setClassCodes] = useState<ClassCodeRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [baseError, setBaseError] = useState("");
  const [selectedClassCode, setSelectedClassCode] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("adminKey") || "");
  const [adminCarrierId, setAdminCarrierId] = useState("");
  const [adminClassCode, setAdminClassCode] = useState("");
  const [appetite, setAppetite] = useState<Appetite>("Write");
  const [constraints, setConstraints] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("2");
  const [active, setActive] = useState(true);

  const [toastMsg, setToastMsg] = useState("");
  const [toastTone, setToastTone] = useState<"ok"|"warn"|"err">("ok");

  const classCodeOptions = useMemo(() => classCodes.filter(c => c.Active !== false).map(c => ({
    value: c.ClassCode, label: c.ClassCode, sub: c.TradeName || ""
  })), [classCodes]);

  const carrierOptions = useMemo(() => carriers.filter(c => c.Active !== false).map(c => ({
    value: c.CarrierID, label: c.CarrierName || c.CarrierID, sub: [c.ChannelType, c.LineType].filter(Boolean).join(" • ")
  })), [carriers]);

  useEffect(() => {
    (async () => {
      try {
        const [cc, cr] = await Promise.all([apiGetClassCodes(), apiGetCarriers()]);
        setClassCodes(cc); setCarriers(cr);
      } catch (e:any) {
        setBaseError(e?.message || "Failed to load data. Check VITE_API_BASE.");
      }
    })();
  }, []);

  async function runSearch(code: string) {
    setSelectedClassCode(code);
    setLoadingResults(true);
    try {
      const r = await apiSearchByClassCode(code);
      setResults(sortResults(r));
    } catch (e:any) {
      setResults([]);
      setToastTone("err"); setToastMsg(e?.message || "Search failed");
    } finally {
      setLoadingResults(false);
    }
  }

  async function loadExistingMapping(carrierId: string, code: string) {
    try {
      const m = await apiGetMapping(carrierId, code);
      if (m) {
        setAppetite(m.Appetite);
        setConstraints(m.Constraints || "");
        setNotes(m.Notes || "");
        setPriority(String(m.Priority ?? ""));
        setActive(m.Active !== false);
        setToastTone("ok"); setToastMsg("Loaded existing mapping.");
      } else {
        setAppetite("Write"); setConstraints(""); setNotes(""); setPriority("2"); setActive(true);
        setToastTone("warn"); setToastMsg("No existing mapping found. You can create one.");
      }
    } catch (e:any) {
      setToastTone("err"); setToastMsg(e?.message || "Failed to load mapping");
    }
  }

  async function saveMapping() {
    if (!adminKey) { setToastTone("warn"); setToastMsg("Enter admin key to save."); return; }
    if (!adminCarrierId || !adminClassCode) { setToastTone("warn"); setToastMsg("Pick carrier + class code first."); return; }
    try {
      localStorage.setItem("adminKey", adminKey);
      const res = await apiUpsertMapping({ carrierId: adminCarrierId, classCode: adminClassCode, appetite, constraints, notes, priority: priority ? Number(priority) : "", active }, adminKey);
      setToastTone("ok"); setToastMsg(`Saved (${res.status}).`);
    } catch (e:any) { setToastTone("err"); setToastMsg(e?.message || "Save failed"); }
  }

  async function deleteMapping() {
    if (!adminKey) { setToastTone("warn"); setToastMsg("Enter admin key to delete."); return; }
    if (!adminCarrierId || !adminClassCode) { setToastTone("warn"); setToastMsg("Pick carrier + class code first."); return; }
    try {
      localStorage.setItem("adminKey", adminKey);
      const res = await apiDeleteMapping({ carrierId: adminCarrierId, classCode: adminClassCode }, adminKey);
      setToastTone("ok"); setToastMsg(`Deleted (${res.status}).`);
      setActive(false);
    } catch (e:any) { setToastTone("err"); setToastMsg(e?.message || "Delete failed"); }
  }

  return (
    <div className="min-h-full bg-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-20 right-[-180px] h-[460px] w-[460px] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-220px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-white">Carrier Appetite Finder</div>
              <div className="text-xs text-slate-300">Google Sheets-backed • Team-ready</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
            <button onClick={() => setMode("search")}
              className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
              mode==="search" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10")}>
              <Search className="h-4 w-4" /> Search
            </button>
            <button onClick={() => setMode("admin")}
              className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
              mode==="admin" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10")}>
              <Settings2 className="h-4 w-4" /> Admin
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-soft backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white">Find carriers by CSLB code</div>
                  <div className="text-sm text-slate-300">Pick a CA contractor classification to see carrier options.</div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Class code</div>
                  <CommandPaletteSelect value={selectedClassCode} onChange={(v) => runSearch(v)} options={classCodeOptions as any}
                    placeholder={classCodes.length ? "Search class codes…" : "No class codes loaded yet"} label="Class code" />
                </div>

                {baseError ? (
                  <div className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-100 ring-1 ring-rose-500/25">
                    <div className="font-semibold">Could not load data</div>
                    <div className="mt-1 text-rose-100/80">{baseError}</div>
                    <div className="mt-2 text-xs text-rose-100/70">
                      Ensure <span className="font-mono">VITE_API_BASE</span> is the Apps Script <span className="font-mono">/exec</span> URL.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-soft backdrop-blur-xl">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-white">Carrier options</div>
                    <div className="text-sm text-slate-300">Carriers tagged for the selected class code.</div>
                  </div>
                </div>

                <div className="mt-5">
                  {!selectedClassCode ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                        <Search className="h-6 w-6 text-white" />
                      </div>
                      <div className="mt-4 text-base font-bold text-white">Select a class code to start</div>
                      <div className="mt-1 text-sm text-slate-300">Use the command palette selector for instant search.</div>
                    </div>
                  ) : loadingResults ? (
                    <div className="grid gap-4 sm:grid-cols-2">{Array.from({length:4}).map((_,i)=>(<div key={i} className="h-40 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />))}</div>
                  ) : results.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                      <div className="mt-4 text-base font-bold text-white">No carriers found</div>
                      <div className="mt-1 text-sm text-slate-300">Add appetite mappings in Admin for this class code.</div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {results.map((r) => (
                        <motion.div key={`${r.carrier.CarrierID}-${r.mapping.ClassCode}-${r.mapping.Appetite}`}
                          whileHover={{y:-3}} transition={{type:"spring",stiffness:300,damping:20}}
                          className="rounded-3xl bg-white/6 p-5 ring-1 ring-white/10">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-extrabold text-white">{r.carrier.CarrierName || r.carrier.CarrierID}</div>
                              <div className="mt-1 text-xs text-slate-300">{[r.carrier.ChannelType, r.carrier.LineType].filter(Boolean).join(" • ")}</div>
                            </div>
                            <AppetiteBadge appetite={r.mapping.Appetite} />
                          </div>

                          {r.carrier.Products ? (
                            <div className="mt-3 text-xs text-slate-300"><span className="font-semibold text-slate-200">Products:</span> {r.carrier.Products}</div>
                          ) : null}

                          {r.mapping.Constraints ? (
                            <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-200 ring-1 ring-white/10">
                              <div className="font-semibold">Constraints</div>
                              <div className="mt-1 text-slate-300">{r.mapping.Constraints}</div>
                            </div>
                          ) : null}

                          {r.mapping.Notes ? (
                            <div className="mt-3 text-xs text-slate-400"><span className="font-semibold text-slate-300">Notes:</span> {r.mapping.Notes}</div>
                          ) : null}

                          {r.carrier.Website ? (
                            <a href={r.carrier.Website} target="_blank" rel="noreferrer"
                              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white">
                              {formatWebsite(r.carrier.Website)} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-soft backdrop-blur-xl">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                    <KeyRound className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-white">Admin editor</div>
                    <div className="text-sm text-slate-300">Update mappings without redeploying the app.</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Admin key</div>
                      <input value={adminKey} onChange={(e)=>setAdminKey(e.target.value)} placeholder="Enter admin key" type="password"
                        className="w-full rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200/70 outline-none focus:ring-slate-300" />
                      <div className="mt-1 text-xs text-slate-400">Stored locally in your browser after first save.</div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Carrier</div>
                      <CommandPaletteSelect value={adminCarrierId} onChange={(v)=>{ setAdminCarrierId(v); if (adminClassCode) loadExistingMapping(v, adminClassCode); }}
                        options={carrierOptions as any} placeholder={carriers.length ? "Search carriers…" : "No carriers loaded yet"} label="Carrier" />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Class code</div>
                      <CommandPaletteSelect value={adminClassCode} onChange={(v)=>{ setAdminClassCode(v); if (adminCarrierId) loadExistingMapping(adminCarrierId, v); }}
                        options={classCodeOptions as any} placeholder={classCodes.length ? "Search class codes…" : "No class codes loaded yet"} label="Class code" />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(["Write","Maybe","No"] as Appetite[]).map((a)=>(
                        <button key={a} onClick={()=>setAppetite(a)}
                          className={cn("rounded-2xl px-3 py-2 text-sm font-semibold ring-1 transition",
                          appetite===a ? "bg-white text-slate-950 ring-white" : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10")}>
                          {a}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Priority</div>
                        <input value={priority} onChange={(e)=>setPriority(e.target.value)} placeholder="2"
                          className="w-full rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200/70 outline-none focus:ring-slate-300" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10">
                          <span>Active</span>
                          <input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)} />
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Constraints</div>
                      <textarea value={constraints} onChange={(e)=>setConstraints(e.target.value)} rows={3}
                        placeholder="Optional constraints" className="w-full resize-none rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200/70 outline-none focus:ring-slate-300" />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Notes</div>
                      <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3}
                        placeholder="Optional notes" className="w-full resize-none rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200/70 outline-none focus:ring-slate-300" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={saveMapping} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-extrabold text-slate-950 shadow-soft transition hover:-translate-y-0.5">
                        <BadgeCheck className="h-4 w-4" /> Save mapping
                      </button>
                      <button onClick={deleteMapping} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                        <X className="h-4 w-4" /> Delete mapping
                      </button>
                      <button onClick={()=>{ localStorage.removeItem("adminKey"); setAdminKey(""); setToastTone("ok"); setToastMsg("Admin key cleared from this browser."); }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                        <KeyRound className="h-4 w-4" /> Clear key
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                    <div className="text-sm font-extrabold text-white">Tip</div>
                    <div className="mt-1 text-xs text-slate-300">
                      If your API page shows <span className="font-mono">Unknown action</span>, add <span className="font-mono">?action=classCodes</span> to the URL.
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Toast message={toastMsg} tone={toastTone} onClose={()=>setToastMsg("")} />
    </div>
  );
}
