
export type Appetite = "Write" | "Maybe" | "No";

export type CarrierRow = {
  CarrierID: string;
  CarrierName: string;
  Program?: string;
  ChannelType?: string;
  LineType?: string;
  Website?: string;
  Products?: string;
  Active?: boolean;
};

export type ClassificationRow = {
  ClassificationID: string; // e.g. CSLB:C-9
  System: "CSLB";
  Code: string;
  Title?: string;
  Active?: boolean;
};

export type AppetiteRow = {
  CarrierID: string;
  ClassificationID: string; // CSLB:C-9
  Appetite: Appetite;
  Constraints?: string;
  Notes?: string;
  Priority?: number | string;
  Active?: boolean;
};

export type SearchResult = { carrier: CarrierRow; mapping: AppetiteRow; classification: ClassificationRow };
export type ReverseResult = { classification: ClassificationRow; mapping: AppetiteRow };

type ApiEnvelope<T> = { ok: boolean; payload?: T; error?: string };

function base() {
  const b = import.meta.env.VITE_API_BASE as string | undefined;
  if (!b) throw new Error("Missing VITE_API_BASE env var");
  return b;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const j = (await r.json()) as ApiEnvelope<T>;
  if (!j.ok) throw new Error(j.error || "API error");
  return j.payload as T;
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as ApiEnvelope<T>;
  if (!j.ok) throw new Error(j.error || "API error");
  return j.payload as T;
}

export async function apiGetCarriers(): Promise<CarrierRow[]> {
  return getJson(`${base()}?action=carriers`);
}

export async function apiGetClassifications(): Promise<ClassificationRow[]> {
  return getJson(`${base()}?action=classifications`);
}

// CSLB-only search
export async function apiSearchCslb(code: string): Promise<SearchResult[]> {
  return getJson(`${base()}?action=search&system=CSLB&code=${encodeURIComponent(code)}`);
}

export async function apiSearchByCarrier(carrierId: string): Promise<ReverseResult[]> {
  return getJson(`${base()}?action=searchByCarrier&carrierId=${encodeURIComponent(carrierId)}`);
}

export async function apiUpsertMapping(args: {
  adminKey: string;
  carrierId: string;
  classificationId: string;
  appetite: Appetite;
  constraints?: string;
  notes?: string;
  priority?: number | string;
  active?: boolean;
}): Promise<{ status: string }> {
  return postJson(`${base()}`, { action: "upsertMapping", ...args });
}

export async function apiDeleteMapping(args: { adminKey: string; carrierId: string; classificationId: string }): Promise<{ status: string }> {
  return postJson(`${base()}`, { action: "deleteMapping", ...args });
}
