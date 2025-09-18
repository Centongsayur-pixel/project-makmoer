// === SUPABASE INIT ===
const SUPABASE_URL = "https://wtdggegqlyzyafuwnhgj.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZGdnZWdxbHl6eWFmdXduaGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NTIzMzQsImV4cCI6MjA3MjAyODMzNH0.o8EG8Uj-alAtQCrZxuZOT2_CQFUypLZMih8gH5JQyOk";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === LOAD DASHBOARD STATS ===
async function loadDashboardStats() {
  try {
    // 1️⃣ Stok rendah
    const { data: lowStock } = await supabase
      .from("items")
      .select("code, name, qty")
      .lt("qty", 5);
    document.getElementById("low-stock-count").innerText =
      (lowStock?.length || 0) + " Barang";

    // 2️⃣ Pindah stok (fix ID)
    const { count: transfersCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "transfer");
    document.getElementById("stock-move-count").innerText = // ✅ FIX
      (transfersCount || 0) + " Perpindahan";

    // 3️⃣ Sering terjual (fix ID)
    const { data: bestSellers } = await supabase
      .from("transactions")
      .select("name, qty")
      .eq("type", "transfer");
    if (bestSellers?.length) {
      const counter = {};
      bestSellers.forEach((t) => {
        counter[t.name] = (counter[t.name] || 0) + t.qty;
      });
      const top = Object.entries(counter).sort((a, b) => b[1] - a[1])[0];
      document.getElementById("best-seller-count").innerText = // ✅ FIX
        top ? `${top[0]} (${top[1]})` : "Belum ada";
    } else {
      document.getElementById("best-seller-count").innerText = "Belum ada"; // ✅ FIX
    }

    // 4️⃣ Perubahan Qty
    const { data: changes } = await supabase.from("transactions").select("id");
    document.getElementById("qty-change-count").innerText =
      (changes?.length || 0) + " Barang";
  } catch (err) {
    console.error("❌ Load dashboard error:", err);
  }
}

// === LOAD ITEMS ===
async function loadItems() {
  try {
    const { data, error } = await supabase.from("items").select("*");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Load items error:", err);
    return [];
  }
}

// === SAVE / UPSERT ITEM (safe + debug) ===
async function saveItem({
  branch,
  code,
  qty,
  name,
  category,
  supplier,
  unit,
  hargaBeliTerakhir,
}) {
  try {
    const payload = { code, branch };
    if (typeof qty !== "undefined") payload.qty = qty;
    if (typeof hargaBeliTerakhir !== "undefined")
      payload.harga_beli_terakhir = hargaBeliTerakhir;
    if (typeof name !== "undefined") payload.name = name;
    if (typeof category !== "undefined") payload.category = category;
    if (typeof supplier !== "undefined") payload.supplier = supplier;
    if (typeof unit !== "undefined") payload.unit = unit;

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("items")
      .upsert([payload], { onConflict: ["code", "branch"] })
      .select();

    if (error) throw error;
    console.log("✅ SaveItem success:", data);
    return true;
  } catch (err) {
    console.error("❌ SaveItem error:", err.message || err);
    return false;
  }
}

// === DELETE ITEM ===
async function deleteItem(branch, code) {
  try {
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("branch", branch)
      .eq("code", code);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Delete item error:", err);
    return false;
  }
}

// === LOG TRANSFER ===
async function logTransfer(code, fromBranch, toBranch, qty) {
  try {
    const payload = {
      code,
      from_branch: fromBranch,
      to_branch: toBranch,
      qty,
      date: new Date().toISOString(),
    };
    const { error } = await supabase.from("transfers").insert([payload]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Transfer log error:", err);
    return false;
  }
}
// ======
// === SAVE BRANCH ===
// ======
async function saveBranch(name) {
  try {
    const { data, error } = await supabase
      .from("branches")
      .upsert([{ name }], { onConflict: ["name"] })
      .select();
    if (error) throw error;
    console.log("✅ Branch saved:", data);
    return true;
  } catch (err) {
    console.error("❌ SaveBranch error:", err.message || err);
    return false;
  }
}

async function loadBranches() {
  try {
    const { data, error } = await supabase.from("branches").select("*");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Load branches error:", err);
    return [];
  }
}
// ======
// === SAVE TRANSACTION (fix: hanya simpan transaksi, tidak update items lagi)
// ======
async function saveTransaction({
  code,
  name,
  branch,
  toBranch,
  type,
  qty,
  price,
  total,
  note,
}) {
  try {
    // 1️⃣ Simpan transaksi ke tabel transactions
    const payload = {
      code,
      name,
      branch,
      to_branch: toBranch || null,
      type,
      qty,
      price: price || 0,
      total: total || 0,
      note: note || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select();

    if (error) throw error;
    console.log("✅ Transaction saved:", data);

    // ✅ Tidak perlu update items di sini.
    // Stok barang sudah diatur oleh updateStock() -> saveItem().
    // Menghindari duplikat baris di tabel items.

    return true;
  } catch (err) {
    console.error("❌ SaveTransaction error:", err.message || err);
    return false;
  }
}
// === LOAD TRANSFERS (today only) ===
async function loadTodayTransfers() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .select("code, name, qty, branch, to_branch, price, created_at") // 🔥 ambil price juga
      .eq("type", "transfer") // ✅ hanya ambil transaksi transfer
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Load today transfers error:", err.message || err);
    return [];
  }
}

// === LOAD TRANSFERS (monthly only) ===
async function loadMonthlyTransfers() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .select("code, name, qty, branch, to_branch, price, created_at") // 🔥 ambil price juga
      .eq("type", "transfer") // ✅ hanya ambil transaksi transfer
      .gte("created_at", `${firstDay}T00:00:00`)
      .lte("created_at", `${lastDay}T23:59:59`);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Load monthly transfers error:", err.message || err);
    return [];
  }
}

// === LOAD ALL TRANSACTIONS (riwayat) ===
async function loadTransactionsHistory(limit = 40) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Load history error:", err.message || err);
    return [];
  }
}
