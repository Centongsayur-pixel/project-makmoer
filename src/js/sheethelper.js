// sheethelper.js
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const credPath = path.join(__dirname, "credentials.json");

// ================= LOAD CREDS =================
let creds;
try {
  creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  // 🔧 Normalisasi private_key kalau ada
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }
} catch (err) {
  console.error("❌ Gagal baca credentials.json:", err.message);
  creds = null; // biar bisa fallback
}

// ================= INIT GOOGLE SHEETS =================
async function initSheets() {
  try {
    if (creds && creds.client_email && creds.private_key) {
      // ✅ Service account auth
      const auth = new GoogleAuth({
        credentials: creds,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return google.sheets({ version: "v4", auth });
    } else if (process.env.GOOGLE_API_KEY) {
      // ✅ Fallback ke API key
      return google.sheets({
        version: "v4",
        auth: process.env.GOOGLE_API_KEY,
      });
    } else {
      throw new Error(
        "Tidak ada kredensial Google (service account / API key)"
      );
    }
  } catch (err) {
    console.error("❌ InitSheets error:", err.message);
    throw err;
  }
}

// ================= HELPER SAFE EXECUTE =================
async function safeExecute(fn, context = "") {
  try {
    return await fn();
  } catch (err) {
    console.error(`❌ [${context}]`, err.message);
    throw err;
  }
}

// ================= CRUD FUNCTIONS =================
export async function getRows(sheetId, range = "Sheet1!A1:Z1000") {
  return safeExecute(async () => {
    const sheets = await initSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    return res.data.values || [];
  }, "getRows");
}

export async function appendRow(sheetId, range, rowData) {
  return safeExecute(async () => {
    const sheets = await initSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  }, "appendRow");
}

export async function updateRow(sheetId, range, rowData) {
  return safeExecute(async () => {
    const sheets = await initSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  }, "updateRow");
}

export async function deleteRow(sheetId, range) {
  return safeExecute(async () => {
    const sheets = await initSheets();
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range,
    });
  }, "deleteRow");
}
