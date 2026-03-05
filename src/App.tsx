
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, ExternalLink, LayoutGrid, Search, Settings2, Tag } from "lucide-react";
import { CommandPaletteSelect } from "./components/CommandPaletteSelect";
import { AdminPanel } from "./components/AdminPanel";
import { apiGetCarriers, apiGetClassifications, apiSearchCslb, apiSearchByCarrier, Appetite, SearchResult, ReverseResult, CarrierRow, ClassificationRow } from "./lib/api";

function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

function Pill({ tone, children }: { tone: "emerald" | "amber" | "rose" | "slate"; children: React.ReactNode }) {
  const styles =
    tone === "emerald" ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25"
    : tone === "amber" ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25"
    : tone === "rose" ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25"
    : "bg-white/10 text-slate-200 ring-1 ring-white/10";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", styles)}>{children}</span>;
}

function AppetiteBadge({ appetite }: { appetite: Appetite }) {
  if (appetite === "Write") return <Pill tone="emerald">Write</Pill>;
  if (appetite === "Maybe") return <Pill tone="amber">Maybe</Pill>;
  return <Pill tone="rose">No</Pill>;
}

function formatWebsite(url?: string) {
  if (!url) return "";
  try { const u = new URL(url); return u.hostname.replace(/^www\./,""); } catch { return url; }
}

function sortByPriorityThenName<T extends { mapping: any }>(arr: T[], getName: (x: T) => string) {
  const appetiteRank = (a: Appetite) => (a === "Write" ? 0 : a === "Maybe" ? 1 : 2);
  return [...arr].sort((x, y) => {
    const px = Number(x.mapping.Priority ?? 9999);
    const py = Number(y.mapping.Priority ?? 9999);
    if (px !== py) return px - py;
    const ax = appetiteRank(x.mapping.Appetite);
    const ay = appetiteRank(y.mapping.Appetite);
    if (ax !== ay) return ax - ay;
    return getName(x).localeCompare(getName(y));
  });
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
        <AlertTriangle className="h-6 w-6 text-white" />
      </div>
      <div className="mt-4 text-base font-bold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{subtitle}</div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-100 ring-1 ring-rose-500/25">{children}</div>;
}

export default function App() {
  const [mode, setMode] = useState<"byCode" | "byCarrier">("byCode");

  const [classifications, setClassifications] = useState<ClassificationRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [baseError, setBaseError] = useState("");

  const [selectedCode, setSelectedCode] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCarrierId, setSelectedCarrierId] = useState("");
  const [reverseResults, setReverseResults] = useState<ReverseResult[]>([]);
  const [loadingReverse, setLoadingReverse] = useState(false);
  const [reverseError, setReverseError] = useState("");

  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cls, cr] = await Promise.all([apiGetClassifications(), apiGetCarriers()]);
        setClassifications(cls.filter((c) => c.System === "CSLB"));
        setCarriers(cr);
      } catch (e: any) {
        setBaseError(e?.message || "Failed to load data. Check VITE_API_BASE.");
      }
    })();
  }, []);

  const codeOptions = useMemo(() => {
    return classifications
      .filter((c) => c.Active !== false)
      .map((c) => ({ value: c.Code, label: c.Code, sub: c.Title || "" }));
  }, [classifications]);

  const carrierOptions = useMemo(() => {
    return carriers
      .filter((c) => c.Active !== false)
      .map((c) => ({ value: c.CarrierID, label: c.CarrierName || c.CarrierID, sub: [c.ChannelType, c.LineType].filter(Boolean).join(" • ") }));
  }, [carriers]);

  async function runSearch(code: string) {
    setSelectedCode(code);
    setLoading(true);
    try {
      const r = await apiSearchCslb(code);
      setResults(sortByPriorityThenName(r, (x) => x.carrier.CarrierName || x.carrier.CarrierID));
      setBaseError("");
    } catch (e: any) {
      setResults([]);
      setBaseError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function runReverse(carrierId: string) {
    setSelectedCarrierId(carrierId);
    setLoadingReverse(true);
    setReverseError("");
    try {
      const r = await apiSearchByCarrier(carrierId);
      setReverseResults(sortByPriorityThenName(r, (x) => x.classification.Code));
    } catch (e: any) {
      setReverseResults([]);
      setReverseError(e?.message || "Carrier search failed");
    } finally {
      setLoadingReverse(false);
    }
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
              <div className="text-xs text-slate-300">California contractors (CSLB) • Google Sheets-backed</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
              <button onClick={() => setMode("byCode")}
                className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition", mode==="byCode" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10")}>
                <Search className="h-4 w-4" /> By class code
              </button>
              <button onClick={() => setMode("byCarrier")}
                className={cn("inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition", mode==="byCarrier" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10")}>
                <Building2 className="h-4 w-4" /> By carrier
              </button>
            </div>

            <button onClick={() => setAdminOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15">
              <Settings2 className="h-4 w-4" /> Admin
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-soft backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  {mode === "byCode" ? <Search className="h-5 w-5 text-white" /> : <Building2 className="h-5 w-5 text-white" />}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white">{mode === "byCode" ? "Find carriers by CSLB code" : "Find codes by carrier"}</div>
                  <div className="text-sm text-slate-300">{mode === "byCode" ? "Pick a CSLB class code and see carrier options." : "Pick a carrier and see mapped CSLB codes."}</div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {baseError ? (
                  <Banner>
                    <div className="font-semibold">Data/API error</div>
                    <div className="mt-1 opacity-90">{baseError}</div>
                    <div className="mt-2 text-xs opacity-80">
                      Confirm <span className="font-mono">VITE_API_BASE</span> is your Apps Script <span className="font-mono">/exec</span> URL.
                    </div>
                  </Banner>
                ) : null}

                {mode === "byCode" ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">CSLB class code</div>
                    <CommandPaletteSelect value={selectedCode} onChange={(v) => runSearch(v)} options={codeOptions as any} placeholder={classifications.length ? "Search codes…" : "No codes loaded yet"} label="Class code" />
                    <div className="mt-2 text-xs text-slate-400">Results are based on rows in <span className="font-mono">Appetites</span>.</div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Carrier</div>
                    <CommandPaletteSelect value={selectedCarrierId} onChange={(v) => runReverse(v)} options={carrierOptions as any} placeholder={carriers.length ? "Search carriers…" : "No carriers loaded yet"} label="Carrier" />
                    {reverseError ? (
                      <div className="mt-3 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-100 ring-1 ring-amber-500/25">
                        <div className="font-semibold">Carrier search error</div>
                        <div className="mt-1 opacity-90">{reverseError}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-soft backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white">{mode === "byCode" ? "Carrier options" : "Mapped codes"}</div>
                  <div className="text-sm text-slate-300">{mode === "byCode" ? "Carriers matched for the selected code." : "CSLB codes mapped to this carrier."}</div>
                </div>
              </div>

              <div className="mt-5">
                {mode === "byCode" ? (
                  !selectedCode ? (
                    <EmptyState title="Select a class code" subtitle="Choose a CSLB code to see carrier options." />
                  ) : loading ? (
                    <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />)}</div>
                  ) : results.length === 0 ? (
                    <EmptyState title="No carriers found" subtitle="No mapped appetites for this CSLB code yet." />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {results.map((r) => (
                        <motion.div key={`${r.carrier.CarrierID}-${r.mapping.ClassificationID}-${r.mapping.Appetite}`} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="rounded-3xl bg-white/6 p-5 ring-1 ring-white/10">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-extrabold text-white">{r.carrier.CarrierName || r.carrier.CarrierID}</div>
                              <div className="mt-1 text-xs text-slate-300">{[r.carrier.ChannelType, r.carrier.LineType].filter(Boolean).join(" • ")}</div>
                              <div className="mt-2 text-xs text-slate-400">
                                Matched on <span className="font-mono">CSLB:{r.classification?.Code || r.mapping.ClassificationID.replace(/^CSLB:/i,"")}</span>
                              </div>
                            </div>
                            <AppetiteBadge appetite={r.mapping.Appetite} />
                          </div>

                          {r.carrier.Products ? <div className="mt-3 text-xs text-slate-300"><span className="font-semibold text-slate-200">Products:</span> {r.carrier.Products}</div> : null}

                          {r.mapping.Constraints ? (
                            <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-200 ring-1 ring-white/10">
                              <div className="font-semibold">Constraints</div>
                              <div className="mt-1 text-slate-300">{r.mapping.Constraints}</div>
                            </div>
                          ) : null}

                          {r.mapping.Notes ? <div className="mt-3 text-xs text-slate-400"><span className="font-semibold text-slate-300">Notes:</span> {r.mapping.Notes}</div> : null}

                          {r.carrier.Website ? (
                            <a href={r.carrier.Website} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white">
                              {formatWebsite(r.carrier.Website)} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  !selectedCarrierId ? (
                    <EmptyState title="Select a carrier" subtitle="Pick a carrier to see mapped CSLB codes." />
                  ) : loadingReverse ? (
                    <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />)}</div>
                  ) : reverseResults.length === 0 ? (
                    <EmptyState title="No codes found" subtitle="That means this carrier has no mapped appetites yet." />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {reverseResults.map((r) => (
                        <motion.div key={`${r.mapping.CarrierID}-${r.mapping.ClassificationID}-${r.mapping.Appetite}`} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="rounded-3xl bg-white/6 p-5 ring-1 ring-white/10">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-extrabold text-white">CSLB {r.classification.Code}</div>
                              <div className="mt-1 text-xs text-slate-300">{r.classification.Title || ""}</div>
                            </div>
                            <AppetiteBadge appetite={r.mapping.Appetite} />
                          </div>

                          {r.mapping.Constraints ? (
                            <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-200 ring-1 ring-white/10">
                              <div className="font-semibold">Constraints</div>
                              <div className="mt-1 text-slate-300">{r.mapping.Constraints}</div>
                            </div>
                          ) : null}

                          {r.mapping.Notes ? <div className="mt-3 text-xs text-slate-400"><span className="font-semibold text-slate-300">Notes:</span> {r.mapping.Notes}</div> : null}
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} carriers={carriers} classifications={classifications} />
      </div>
    </div>
  );
}
