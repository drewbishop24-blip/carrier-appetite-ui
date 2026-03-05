
import React, { useEffect, useMemo, useState } from "react";
import { HelpCircle, KeyRound, Save, Trash2, CheckCircle2 } from "lucide-react";
import { CommandPaletteSelect } from "./CommandPaletteSelect";
import { Modal } from "./Modal";
import { apiDeleteMapping, apiUpsertMapping, Appetite, CarrierRow, ClassificationRow } from "../lib/api";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const HOWTO = "ADMIN HOW\u2011TO\n\nThis admin tool edits the Appetites tab in Google Sheets.\n\nRequired Tabs\n- Carriers\n- Classifications (CSLB only)\n- Appetites\n\nAdd/Update a rule\n1) Open Admin\n2) Enter ADMIN KEY\n3) Select Carrier\n4) Select CSLB code\n5) Set Appetite (Write/Maybe/No)\n6) Add optional Constraints/Notes\n7) Save\n\nDelete a rule (soft delete)\n- Select same Carrier + CSLB code, click Delete (sets Active=false)\n\nTip\n- Keep CarrierID stable forever. If a carrier name changes, update CarrierName but keep CarrierID the same.\n";

export function AdminPanel({
  open,
  onClose,
  carriers,
  classifications,
}: {
  open: boolean;
  onClose: () => void;
  carriers: CarrierRow[];
  classifications: ClassificationRow[];
}) {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem("CAF_ADMIN_KEY") || "");
  const [showHowTo, setShowHowTo] = useState(false);

  const [carrierId, setCarrierId] = useState("");
  const [classificationId, setClassificationId] = useState("");
  const [appetite, setAppetite] = useState<Appetite>("Write");
  const [constraints, setConstraints] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("");
  const [active, setActive] = useState(true);

  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("CAF_ADMIN_KEY", adminKey);
  }, [adminKey]);

  const carrierOptions = useMemo(
    () =>
      carriers
        .filter((c) => c.Active !== false)
        .map((c) => ({ value: c.CarrierID, label: c.CarrierName || c.CarrierID, sub: [c.ChannelType, c.LineType].filter(Boolean).join(" • ") })),
    [carriers]
  );

  const codeOptions = useMemo(
    () =>
      classifications
        .filter((c) => c.Active !== false)
        .map((c) => ({ value: c.ClassificationID, label: c.Code, sub: c.Title || "" })),
    [classifications]
  );

  async function save() {
    setStatus("");
    try {
      if (!adminKey.trim()) throw new Error("Admin key required");
      if (!carrierId) throw new Error("Carrier required");
      if (!classificationId) throw new Error("Class code required");

      const r = await apiUpsertMapping({
        adminKey,
        carrierId,
        classificationId,
        appetite,
        constraints,
        notes,
        priority,
        active,
      });
      setStatus(`Saved: ${r.status}`);
    } catch (e: any) {
      setStatus(e?.message || "Save failed");
    }
  }

  async function remove() {
    setStatus("");
    try {
      if (!adminKey.trim()) throw new Error("Admin key required");
      if (!carrierId) throw new Error("Carrier required");
      if (!classificationId) throw new Error("Class code required");

      const r = await apiDeleteMapping({
        adminKey,
        carrierId,
        classificationId,
      });
      setStatus(`Deleted: ${r.status}`);
    } catch (e: any) {
      setStatus(e?.message || "Delete failed");
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Admin portal"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Writes update the <span className="font-mono">Appetites</span> tab.
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHowTo(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                <HelpCircle className="h-4 w-4" /> How to
              </button>
              <button onClick={remove} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button onClick={save} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin key</div>
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <input value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Enter admin key"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            </div>
            <div className="text-xs text-slate-500">Saved locally in this browser after first entry.</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</div>
            <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="text-sm text-slate-800">Rule is active</span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carrier</div>
            <CommandPaletteSelect value={carrierId} onChange={setCarrierId} options={carrierOptions as any} placeholder="Search carriers…" label="Carrier" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CSLB class code</div>
            <CommandPaletteSelect value={classificationId} onChange={setClassificationId} options={codeOptions as any} placeholder="Search CSLB codes…" label="Class code" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appetite</div>
            <div className="grid grid-cols-3 gap-2">
              {["Write","Maybe","No"].map((x) => (
                <button key={x} onClick={() => setAppetite(x as Appetite)}
                  className={cn("rounded-2xl px-3 py-2 text-sm font-semibold ring-1 transition", appetite===x ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50")}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority (optional)</div>
            <input value={priority} onChange={(e)=>setPriority(e.target.value)} placeholder="Lower = shows first"
              className="w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Constraints (optional)</div>
            <textarea value={constraints} onChange={(e)=>setConstraints(e.target.value)} rows={2} placeholder="Underwriting constraints"
              className="w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</div>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Notes for producers"
              className="w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400" />
          </div>
        </div>

        {status ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {status}
          </div>
        ) : null}
      </Modal>

      <Modal open={showHowTo} onClose={() => setShowHowTo(false)} title="How to update appetites">
        <div className="whitespace-pre-wrap rounded-3xl bg-slate-50 p-5 text-sm text-slate-800 ring-1 ring-slate-200">{HOWTO}</div>
      </Modal>
    </>
  );
}
