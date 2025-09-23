// testSheet.js
import { getRows, appendRow, updateRow, deleteRow } from "./sheethelper.js";

const SHEET_ID = "1qUYLdPM0wNFW7u2e3AqRIn4rJwZQUrcsluZK9hDfmIQ";

async function run() {
  try {
    console.log("📊 Baca data awal:");
    const rows = await getRows(SHEET_ID, "Sheet1!A1:C10");
    console.log(rows);

    console.log("➕ Tambah data baru:");
    await appendRow(SHEET_ID, "Sheet1!A:C", ["Kode123", "Barang Baru", "PCS"]);
    console.log("✅ Row ditambahkan");

    console.log("✏️ Update data (A2:C2):");
    await updateRow(SHEET_ID, "Sheet1!A2:C2", [
      "Kode999",
      "Barang Update",
      "Box",
    ]);
    console.log("✅ Row diupdate");

    console.log("🗑️ Hapus data (A3:C3):");
    await deleteRow(SHEET_ID, "Sheet1!A3:C3");
    console.log("✅ Row dihapus");

    console.log("📊 Data akhir:");
    const finalRows = await getRows(SHEET_ID, "Sheet1!A1:C10");
    console.log(finalRows);
  } catch (err) {
    console.error("❌ Test error:", err.message);
  }
}

run();
