/* CSLB-only Apps Script API
 * Tabs: Carriers, Classifications, Appetites
 * Endpoints:
 *  GET ?action=carriers
 *  GET ?action=classifications
 *  GET ?action=search&system=CSLB&code=C-9
 *  GET ?action=searchByCarrier&carrierId=Next
 *  POST {action:'upsertMapping', adminKey, carrierId, classificationId, appetite, ...}
 *  POST {action:'deleteMapping', adminKey, carrierId, classificationId}
 */
const SPREADSHEET_ID = "18mface9b97kC67fzgBhe4-3POjRPueYdSUcM9BSMmuQ";

function doGet(e) {
  const action = ((e.parameter.action || "") + "").toLowerCase();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    if (action === "carriers") return jsonOk(getTable(ss, "Carriers"));
    if (action === "classifications") return jsonOk(getTable(ss, "Classifications"));

    if (action === "search") {
      const system = ((e.parameter.system || "") + "").trim().toUpperCase();
      const code = ((e.parameter.code || "") + "").trim();
      if (!system || !code) return jsonErr("Missing system or code");
      if (system !== "CSLB") return jsonErr("Only CSLB system is supported");
      return jsonOk(searchByCslbCode(ss, code));
    }

    if (action === "searchbycarrier") {
      const carrierId = (e.parameter.carrierId || "").trim();
      if (!carrierId) return jsonErr("Missing carrierId");
      return jsonOk(searchByCarrier(ss, carrierId));
    }

    return jsonErr("Unknown action");
  } catch (err) {
    return jsonErr(err.message || "Server error");
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (_) {}

  const action = ((body.action || "") + "").toLowerCase();
  const suppliedKey = ((body.adminKey || "") + "").trim();
  const expectedKey = (PropertiesService.getScriptProperties().getProperty("ADMIN_KEY") || "").trim();
  if (!expectedKey || suppliedKey !== expectedKey) return jsonErr("Unauthorized", 401);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    if (action === "upsertmapping") return jsonOk(upsertMapping(ss, body));
    if (action === "deletemapping") {
      const carrierId = (body.carrierId || "").trim();
      const classificationId = (body.classificationId || "").trim();
      if (!carrierId || !classificationId) return jsonErr("Missing carrierId or classificationId");
      return jsonOk(deleteMapping(ss, carrierId, classificationId));
    }
    return jsonErr("Unknown action");
  } catch (err) {
    return jsonErr(err.message || "Server error");
  }
}

function getTable(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error(`Missing sheet: ${sheetName}`);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => (h + "").trim());

  return values
    .slice(1)
    .filter((row) => row.some((c) => c !== "" && c !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function makeCslbId(code) {
  const c = (code + "").trim();
  return c.toUpperCase().startsWith("CSLB:") ? c : `CSLB:${c}`;
}

function searchByCslbCode(ss, code) {
  const carriers = getTable(ss, "Carriers").filter((c) => c.Active !== false);
  const classifications = getTable(ss, "Classifications").filter((c) => c.Active !== false);
  const appetites = getTable(ss, "Appetites").filter((a) => a.Active !== false);

  const classificationId = makeCslbId(code);

  const carrierMap = new Map(carriers.map((c) => [(c.CarrierID + "").trim(), c]));
  const classMap = new Map(classifications.map((c) => [(c.ClassificationID + "").trim(), c]));

  return appetites
    .filter((a) => (a.ClassificationID + "").trim() === classificationId)
    .map((a) => {
      const carrier = carrierMap.get((a.CarrierID + "").trim());
      const cls = classMap.get((a.ClassificationID + "").trim());
      if (!carrier) return null;
      return { carrier, mapping: a, classification: cls || { ClassificationID: classificationId, System: "CSLB", Code: code, Title: "" } };
    })
    .filter(Boolean);
}

function searchByCarrier(ss, carrierId) {
  const classifications = getTable(ss, "Classifications").filter((c) => c.Active !== false);
  const appetites = getTable(ss, "Appetites").filter((a) => a.Active !== false);

  const classMap = new Map(classifications.map((c) => [(c.ClassificationID + "").trim(), c]));

  return appetites
    .filter((a) => (a.CarrierID + "").trim() === carrierId)
    .map((a) => {
      const clsId = (a.ClassificationID + "").trim();
      const cls = classMap.get(clsId) || { ClassificationID: clsId, System: "CSLB", Code: clsId.replace(/^CSLB:/i, ""), Title: "" };
      return { classification: cls, mapping: a };
    });
}

function upsertMapping(ss, body) {
  const sh = ss.getSheetByName("Appetites");
  if (!sh) throw new Error("Missing sheet: Appetites");

  const carrierId = (body.carrierId || "").trim();
  const classificationId = (body.classificationId || "").trim();
  const appetite = (body.appetite || "").trim();
  if (!carrierId || !classificationId || !appetite) throw new Error("carrierId, classificationId, appetite required");

  const data = sh.getDataRange().getValues();
  const headers = data[0].map((h) => (h + "").trim());

  const idxCarrier = headers.indexOf("CarrierID");
  const idxClass = headers.indexOf("ClassificationID");
  const idxActive = headers.indexOf("Active");
  if (idxCarrier < 0 || idxClass < 0) throw new Error("Appetites must include CarrierID and ClassificationID columns");
  if (idxActive < 0) throw new Error("Appetites must include Active column");

  const rowObj = {
    CarrierID: carrierId,
    ClassificationID: classificationId,
    Appetite: appetite,
    Constraints: body.constraints || "",
    Notes: body.notes || "",
    Priority: body.priority ?? "",
    Active: body.active !== false
  };

  let targetRow = -1;
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if ((row[idxCarrier] + "").trim() === carrierId && (row[idxClass] + "").trim() === classificationId) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    sh.appendRow(headers.map((h) => (rowObj[h] !== undefined ? rowObj[h] : "")));
    return { status: "inserted" };
  }

  const existing = data[targetRow - 1];
  const updated = headers.map((h, i) => (rowObj[h] !== undefined ? rowObj[h] : existing[i]));
  sh.getRange(targetRow, 1, 1, headers.length).setValues([updated]);
  return { status: "updated" };
}

function deleteMapping(ss, carrierId, classificationId) {
  const sh = ss.getSheetByName("Appetites");
  if (!sh) throw new Error("Missing sheet: Appetites");

  const data = sh.getDataRange().getValues();
  const headers = data[0].map((h) => (h + "").trim());

  const idxCarrier = headers.indexOf("CarrierID");
  const idxClass = headers.indexOf("ClassificationID");
  const idxActive = headers.indexOf("Active");

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if ((row[idxCarrier] + "").trim() === carrierId && (row[idxClass] + "").trim() === classificationId) {
      sh.getRange(r + 1, idxActive + 1).setValue(false);
      return { status: "deleted" };
    }
  }
  return { status: "not_found" };
}

function jsonOk(payload) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, payload }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(message, status) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message, status: status || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}
