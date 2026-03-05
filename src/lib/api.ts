
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

export type ClassCodeRow = {
  ClassCode: string;
  TradeName?: string;
  Active?: boolean;
};

export type AppetiteRow = {
  CarrierID: string;
  ClassCode: string;
  Appetite: Appetite;
  Constraints?: string;
  Notes?: string;
  Priority?: number | string;
  Active?: boolean;
};

export type SearchResult = {
  carrier: CarrierRow;
  mapping: AppetiteRow;
};

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

export async function apiGetClassCodes(): Promise<ClassCodeRow[]> {
  return getJson(`${base()}?action=classCodes`);
}

export async function apiGetCarriers(): Promise<CarrierRow[]> {
  return getJson(`${base()}?action=carriers`);
}

export async function apiSearchByClassCode(classCode: string): Promise<SearchResult[]> {
  return getJson(`${base()}?action=search&classCode=${encodeURIComponent(classCode)}`);
}

export async function apiGetMapping(carrierId: string, classCode: string): Promise<AppetiteRow | null> {
  return getJson(`${base()}?action=mapping&carrierId=${encodeURIComponent(carrierId)}&classCode=${encodeURIComponent(classCode)}`);
}

export async function apiUpsertMapping(payload: {
  carrierId: string;
  classCode: string;
  appetite: Appetite;
  constraints?: string;
  notes?: string;
  priority?: number | string;
  active?: boolean;
}, adminKey: string): Promise<{status: string}> {
  const r = await fetch(base(), {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action: "upsertMapping", adminKey, ...payload })
  });
  const j = (await r.json()) as ApiEnvelope<{status: string}>;
  if (!j.ok) throw new Error(j.error || "API error");
  return j.payload as {status: string};
}

export async function apiDeleteMapping(payload: { carrierId: string; classCode: string }, adminKey: string): Promise<{status: string}> {
  const r = await fetch(base(), {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action: "deleteMapping", adminKey, ...payload })
  });
  const j = (await r.json()) as ApiEnvelope<{status: string}>;
  if (!j.ok) throw new Error(j.error || "API error");
  return j.payload as {status: string};
}
