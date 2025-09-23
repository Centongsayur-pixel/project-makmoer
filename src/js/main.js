// ===================== MAIN.JS (FULL FIX) =====================

// === DATA LOCAL ===
let stockData = { "Gudang Utama": {} };
let stockMeta = { "Gudang Utama": {} };

// ===== HAPUS ITEM =====
async function handleDeleteItem(branch, code) {
  const ok = await deleteItem(branch, code);
  if (!ok) return;

  if (stockData[branch] && stockData[branch][code]) {
    delete stockData[branch][code];
  }
  if (stockMeta[branch] && stockMeta[branch][code]) {
    delete stockMeta[branch][code];
  }

  const row = itemGrid.querySelector(`[data-code="${code}"]`);
  if (row) row.remove();

  updateInventorySummary();
}
// ===== INIT: Load dari Supabase (FIXED + Gabung per code + Simpan Nama Produk) =====
async function initApp() {
  try {
    // 1. Load cabang dari Supabase
    const branchesFromDB = await loadBranches();
    const allBranches = branchesFromDB.map((b) => b.name);

    // reset data lokal & UI
    stockData = {};
    stockMeta = {};
    itemGrid.innerHTML = "";
    branchContainer.innerHTML = ""; // reset checkbox cabang

    // render ulang checkbox cabang dari DB
    allBranches.forEach((branchName) => {
      ensureBranchInStockData(branchName);
      updateBranchSelectOptions(branchName);

      const label = document.createElement("label");
      label.className = "flex items-center gap-2";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-checkbox text-blue-600 branch-checkbox";
      checkbox.dataset.branch = branchName;
      checkbox.checked = true;
      checkbox.addEventListener("change", () => {
        refreshQtyDisplay();
        updateInventorySummary(); // 🔄 update ringkasan kalau cabang difilter
      });

      const span = document.createElement("span");
      span.className = "text-sm";
      span.textContent = branchName;

      label.appendChild(checkbox);
      label.appendChild(span);
      branchContainer.appendChild(label);
    });

    // bersihkan container kategori (supaya tidak duplikat)
    if (categoryContainer) {
      categoryContainer.innerHTML = "";

      // ⬅️ tambahkan ulang tombol ALL
      const btnAll = document.createElement("button");
      btnAll.type = "button";
      btnAll.dataset.categoryBtn = "all";
      btnAll.textContent = "All";
      btnAll.className =
        "px-3 py-1 text-sm bg-primary text-white rounded-full hover:bg-primary/80";
      btnAll.addEventListener("click", () => {
        filterItemsByCategory("all");
        updateInventorySummary(); // 🔄 update ringkasan kalau kategori difilter
      });
      categoryContainer.appendChild(btnAll);
    }

    // 2. Load items dari Supabase
    const items = await loadItems();

    // 🔹 Group by code → gabungkan stok dari semua cabang
    const grouped = {};

    items.forEach((item) => {
      const branch = item.branch || "Gudang Utama";
      const code = item.code || item.name || "UNKNOWN";
      const catName = (item.category || "Uncategorized").toString().trim();

      // pastikan struktur meta ada
      ensureCodeMeta(branch, code);

      // set qty & meta per cabang
      stockData[branch][code] = Number(item.qty) || 0;
      stockMeta[branch][code].category = catName;
      stockMeta[branch][code].hargaBeliTerakhir =
        item.harga_beli_terakhir || item.hargaBeliTerakhir || 0;
      stockMeta[branch][code].totalCost =
        (Number(item.qty) || 0) * (Number(item.harga_beli_terakhir) || 0);
      stockMeta[branch][code].totalQty = Number(item.qty) || 0;

      // ✅ simpan nama produk juga untuk chart & laporan
      stockMeta[branch][code].name = item.name || code;

      // 🔹 Gabungkan qty untuk tampilan (group by code)
      if (!grouped[code]) {
        grouped[code] = {
          code,
          name: item.name || code,
          supplier: item.supplier || "Unknown",
          qty: Number(item.qty) || 0,
          category: catName,
          unit: item.unit || "-",
        };
      } else {
        grouped[code].qty += Number(item.qty) || 0;
      }

      // pastikan tombol kategori tersedia (idempotent)
      addCategoryButton(catName);

      // update dropdown cabang
      updateBranchSelectOptions(branch);

      // pastikan semua branch punya entry untuk kode ini (default 0)
      allBranches.forEach((b) => {
        if (!stockData[b]) stockData[b] = {};
        if (!stockMeta[b]) stockMeta[b] = {};
        if (!(code in stockData[b])) {
          stockData[b][code] = 0;
          ensureCodeMeta(b, code);
          stockMeta[b][code].category =
            stockMeta[branch][code].category || "Uncategorized";
          // tetap isi nama biar konsisten
          stockMeta[b][code].name = stockMeta[branch][code].name || code;
        }
      });
    });

    // 🔹 Render hanya sekali per kode barang
    Object.values(grouped).forEach((item) => {
      renderItemRow(item);
    });

    // set tombol "All" aktif
    if (categoryContainer) {
      const allBtn = categoryContainer.querySelector(
        '[data-category-btn="all"]'
      );
      categoryContainer
        .querySelectorAll("button[data-category-btn]")
        .forEach((b) => {
          b.className =
            "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200";
        });
      if (allBtn) {
        allBtn.className =
          "px-3 py-1 text-sm bg-primary text-white rounded-full hover:bg-primary/80";
      }
      filterItemsByCategory("all");
    }

    // ✅ refresh & update summary di awal load
    refreshQtyDisplay();
    updateInventorySummary(); // lokal
    await loadDashboardStats(); // 🔥 ambil summary langsung dari Supabase
  } catch (err) {
    console.error("initApp error:", err);
  }
}

// auto run pas halaman siap
document.addEventListener("DOMContentLoaded", initApp);

// ===== SUMMARY (fix full) =====
function updateInventorySummary() {
  const categoriesEl = document.getElementById("summary-categories");
  const branchesEl = document.getElementById("summary-branches");
  const qtyEl = document.getElementById("summary-total-qty");
  const valueEl = document.getElementById("summary-total-value");
  const lowStockEl = document.getElementById("low-stock-count");
  const stockMoveEl = document.getElementById("stock-move-count");
  const qtyChangeEl = document.getElementById("qty-change-count");
  const bestSellerEl = document.getElementById("best-seller-count");
  const branchSummaryEl = document.getElementById("branch-summary");

  // kalau elemen tidak ada, stop biar nggak error
  if (
    !categoriesEl ||
    !branchesEl ||
    !qtyEl ||
    !valueEl ||
    !lowStockEl ||
    !stockMoveEl ||
    !qtyChangeEl ||
    !bestSellerEl
  ) {
    console.warn("⚠️ Elemen ringkasan tidak ditemukan di DOM, skip update.");
    return;
  }

  // ambil semua baris item
  const rows = document.querySelectorAll("#item-rows > div");

  // hitung kategori unik
  const categories = new Set();
  rows.forEach((row) => {
    const cat = row.dataset.category || "";
    if (cat) categories.add(cat);
  });

  // hitung total qty & total value
  let totalQty = 0;
  let totalValue = 0;
  let lowStockCount = 0;
  let totalChange = 0;
  let bestSeller = { name: null, qty: 0 };

  rows.forEach((row) => {
    const name = row.children[1]?.textContent || "";
    const qty = parseInt(row.children[3]?.textContent.replace(/\./g, "")) || 0;
    const masuk =
      parseInt(row.children[5]?.textContent.replace(/\./g, "")) || 0;
    const keluar =
      parseInt(row.children[6]?.textContent.replace(/\./g, "")) || 0;
    const avgHarga =
      parseInt(row.children[8]?.textContent.replace(/\./g, "")) || 0;

    totalQty += qty;
    totalValue += qty * avgHarga;
    if (qty > 0 && qty < 10) lowStockCount++;
    totalChange += masuk + keluar;

    if (keluar > bestSeller.qty) {
      bestSeller = { name, qty: keluar };
    }
  });

  // ✅ Folder = jumlah item
  const itemCount = rows.length;

  // sementara transferCount = 0 (nanti bisa diisi dari log transaksi Supabase)
  const transferCount = 0;

  // update ke UI
  categoriesEl.textContent = categories.size;
  branchesEl.textContent = itemCount;
  qtyEl.textContent = `${totalQty.toLocaleString("id-ID")} Barang`;
  valueEl.textContent = `Rp ${totalValue.toLocaleString("id-ID")}`;
  lowStockEl.textContent = `${lowStockCount} Barang`;
  stockMoveEl.textContent = `${transferCount} Perpindahan`;
  qtyChangeEl.textContent = `${totalChange} Barang`;

  if (bestSeller.qty > 0) {
    bestSellerEl.textContent = `${bestSeller.name} (${bestSeller.qty})`;
  } else {
    bestSellerEl.textContent = "Belum ada";
  }

  // ringkasan per branch
  if (branchSummaryEl) {
    branchSummaryEl.innerHTML = "";
    for (const [branch, items] of Object.entries(stockData)) {
      const validItems = Object.entries(items).filter(([_, qty]) => qty > 0);
      if (validItems.length === 0) continue;

      const totalItems = validItems.length;
      const totalQtyBranch = validItems.reduce((sum, [_, qty]) => sum + qty, 0);

      const row = document.createElement("div");
      row.textContent = `${branch}: ${totalItems} items, ${totalQtyBranch} stok total`;
      branchSummaryEl.appendChild(row);
    }
  }
}

// ===================== (SISA KODE UI & LOGIC ASLI) =====================
// Berikut adalah sisa file JS kamu yang asli — aku **tidak** menghilangkan
// fungsi UI, modal, chart, filter, history, dll. Aku hanya menambahkan/menyambungkan
// fungsi terkait stok ke Supabase di bagian atas (updateStock/transferStock/addInitialStock).
// Semua kode di bawah ini tetap persis seperti aslinya.

// === BOTTOM NAVIGATION ===
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();

    // Reset nav
    navItems.forEach((i) => {
      i.classList.remove("primary");
      i.classList.add("text-gray-500");
      const indicator = i.querySelector(".indicator");
      if (indicator) indicator.remove();
    });

    // Aktifkan yang diklik
    item.classList.remove("text-gray-500");
    item.classList.add("primary");
    const dot = document.createElement("span");
    dot.className =
      "indicator absolute -bottom-1 w-1 h-1 rounded-full bg-[#1A2A80]";
    item.appendChild(dot);

    // Tampilkan section target
    sections.forEach((section) => {
      section.classList.add("hidden-section");
      section.classList.remove("active-section");
    });
    const target = item.getAttribute("data-tab");
    const activeSection = document.getElementById(target);
    if (activeSection) {
      activeSection.classList.remove("hidden-section");
      setTimeout(() => {
        activeSection.classList.add("active-section");
      }, 10);
    }
  });
});

// === HOME SECTION ===
document.addEventListener("DOMContentLoaded", () => {
  const elDate = document.querySelector("#current-date span:last-child");
  const elIcon = document.getElementById("date-icon");

  function updateDate() {
    const now = new Date();

    // --- icon ganti siang/malam ---
    const hour = now.getHours();
    if (hour >= 6 && hour < 18) {
      // Matahari
      elIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25
               m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227
               -1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636
               M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>
        </svg>
      `;
    } else {
      // Bulan
      elIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75
               c-5.385 0-9.75-4.365-9.75-9.75
               0-1.33.266-2.597.748-3.752A9.753
               9.753 0 0 0 3 11.25C3 16.635 7.365
               21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/>
        </svg>
      `;
    }

    // --- tanggal ---
    const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
    const tanggal = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    elDate.textContent = `${hari}, ${tanggal}`;
  }

  updateDate();
  // update tiap jam supaya kalau hari/jam berubah langsung ikut
  setInterval(updateDate, 60 * 60 * 1000);
});

// === ITEM SECTION ===

// -- SEARCH ITEMS
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

function filterItemsBySearch(keyword) {
  const rows = itemGrid ? itemGrid.querySelectorAll("[data-code]") : [];
  keyword = keyword.trim().toLowerCase();

  rows.forEach((row) => {
    const code = row.children[0]?.textContent.toLowerCase() || "";
    const name = row.children[1]?.textContent.toLowerCase() || "";
    const supplier = row.children[2]?.textContent.toLowerCase() || "";
    const match =
      code.includes(keyword) ||
      name.includes(keyword) ||
      supplier.includes(keyword);
    row.style.display = match ? "" : "none";
  });
}

// Event: ketik di input
searchInput?.addEventListener("input", () => {
  const val = searchInput.value;
  if (val) {
    clearSearchBtn?.classList.remove("hidden");
  } else {
    clearSearchBtn?.classList.add("hidden");
  }
  filterItemsBySearch(val);
});

// Event: klik tombol clear
clearSearchBtn?.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");
  filterItemsBySearch("");
});

// === adjust filter
const adjustBtn = document.getElementById("adjustButton");
const filterModal = document.getElementById("filterModal");
const closeFilterBtn = document.getElementById("closeFilter");
const filterForm = document.getElementById("filterForm");
const resetFilterBtn = document.getElementById("resetFilter");

let activeFilter = { category: "", supplier: "", minStock: "" };

// buka modal
adjustBtn?.addEventListener("click", () => {
  filterModal.classList.remove("hidden");
  filterModal.classList.add("flex");
});

// tutup modal
closeFilterBtn?.addEventListener("click", () => {
  filterModal.classList.add("hidden");
  filterModal.classList.remove("flex");
});
filterModal?.addEventListener("click", (e) => {
  if (e.target === filterModal) {
    filterModal.classList.add("hidden");
    filterModal.classList.remove("flex");
  }
});

// apply filter
filterForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(filterForm);
  activeFilter.category = (fd.get("category") || "").toString().toLowerCase();
  activeFilter.supplier = (fd.get("supplier") || "").toString().toLowerCase();
  activeFilter.minStock = parseInt(fd.get("minStock") || "0") || 0;

  applyCombinedFilters();
  filterModal.classList.add("hidden");
  filterModal.classList.remove("flex");
});

// reset filter
resetFilterBtn?.addEventListener("click", () => {
  activeFilter = { category: "", supplier: "", minStock: "" };
  filterForm.reset();
  applyCombinedFilters();
});

// gabungan search + filter
function applyCombinedFilters() {
  const keyword = searchInput?.value.trim().toLowerCase() || "";
  const rows = itemGrid ? itemGrid.querySelectorAll("[data-code]") : [];

  rows.forEach((row) => {
    const code = row.children[0]?.textContent.toLowerCase() || "";
    const name = row.children[1]?.textContent.toLowerCase() || "";
    const supplier = row.children[2]?.textContent.toLowerCase() || "";
    const qty = parseInt(row.children[3]?.textContent.replace(/\./g, "")) || 0;
    const category = (row.dataset.category || "").toLowerCase();

    // syarat filter
    const matchSearch =
      !keyword ||
      code.includes(keyword) ||
      name.includes(keyword) ||
      supplier.includes(keyword);
    const matchCategory =
      !activeFilter.category || category.includes(activeFilter.category);
    const matchSupplier =
      !activeFilter.supplier || supplier.includes(activeFilter.supplier);
    const matchStock = !activeFilter.minStock || qty >= activeFilter.minStock;

    row.style.display =
      matchSearch && matchCategory && matchSupplier && matchStock ? "" : "none";
  });
}

// === ADD ITEM ===
const branchBtn = document.getElementById("branch-btn");
const branchList = document.getElementById("branch-list");
const branchContainer = document.getElementById("branch-container");
const addBranchBtn = document.getElementById("add-branch-btn");
const branchModal = document.getElementById("branch-modal");
const branchForm = document.getElementById("branch-form");
const cancelBranchBtn = document.getElementById("cancel-branch-btn");
const addItemBtn = document.getElementById("add-item-btn");
const itemModal = document.getElementById("item-modal");
const itemGrid = document.getElementById("item-rows");
const categoryContainer = document.getElementById("category-filters");

// ===== UTILITY =====
function ensureBranchInStockData(branchName) {
  if (!stockData[branchName]) stockData[branchName] = {};
  if (!stockMeta[branchName]) stockMeta[branchName] = {};
}

// canonical ensureCodeMeta — hanya satu definisi, inisialisasi lengkap
function ensureCodeMeta(branchName, code) {
  ensureBranchInStockData(branchName);

  if (!stockMeta[branchName][code]) {
    stockMeta[branchName][code] = {
      masukSupplier: 0,
      masukTransfer: 0,
      keluar: 0,
      totalCost: 0,
      totalQty: 0,
      hargaBeliTerakhir: 0,
      category: "Uncategorized",
      supplier: "Unknown",
      unit: "-",
      name: code,
    };
  }

  if (typeof stockData[branchName][code] === "undefined") {
    stockData[branchName][code] = 0;
  }
}

// ===== SYNCED FUNCTIONS (integrasi Supabase) =====
// pastikan definisi updateStock ada sebelum dipanggil di tempat lain
async function updateStock(branchName, code, qtyChange, type = "supplier") {
  // pastikan struktur data ada
  ensureCodeMeta(branchName, code);

  // normalisasi angka
  const cur = Number(stockData[branchName][code] || 0);
  const change = Number(qtyChange || 0);

  // update local (synchronous) terlebih dahulu — sangat penting
  stockData[branchName][code] = cur + change;

  // update meta counters
  if (change > 0) {
    if (type === "supplier")
      stockMeta[branchName][code].masukSupplier += change;
    else if (type === "transfer")
      stockMeta[branchName][code].masukTransfer += change;
    stockMeta[branchName][code].totalQty =
      (stockMeta[branchName][code].totalQty || 0) + change;
  } else if (change < 0) {
    stockMeta[branchName][code].keluar =
      (stockMeta[branchName][code].keluar || 0) + Math.abs(change);
  }

  // refresh UI segera (pakai nilai di stockData)
  try {
    refreshQtyDisplay();
    updateInventorySummary();
  } catch (e) {
    console.warn("UI refresh warning:", e);
  }

  // persist ke Supabase (async) — stockData sudah updated
  try {
    await saveItem({
      branch: branchName,
      code,
      qty: stockData[branchName][code],
      hargaBeliTerakhir: stockMeta[branchName][code].hargaBeliTerakhir || 0,
      name: stockMeta[branchName][code].name || code,
      category: stockMeta[branchName][code].category || "Uncategorized",
      supplier: stockMeta[branchName][code].supplier || "Unknown",
      unit: stockMeta[branchName][code].unit || "-",
    });
  } catch (err) {
    console.error("Failed saving item to Supabase:", err);
    // opsional: rollback local jika mau konsistensi kuat
  }
}

// transferStock sekarang async dan menunggu updateStock
async function transferStock(fromBranch, toBranch, code, qty) {
  ensureCodeMeta(fromBranch, code);
  ensureCodeMeta(toBranch, code);

  // kurangi stok di asal dulu (local + DB)
  await updateStock(fromBranch, code, -qty, "transfer");

  // tambah stok di tujuan
  await updateStock(toBranch, code, qty, "transfer");

  // log transfer
  try {
    await logTransfer(code, fromBranch, toBranch, qty);
  } catch (err) {
    console.error("Failed logging transfer:", err);
  }
}

// addInitialStock jadi async supaya bisa await updateStock jika perlu
async function addInitialStock(branch, code, qty) {
  ensureCodeMeta(branch, code);
  const meta = stockMeta[branch][code];
  const cur = Number(stockData[branch][code] || 0);

  if (
    meta.masukSupplier === 0 &&
    meta.masukTransfer === 0 &&
    meta.keluar === 0 &&
    cur === 0
  ) {
    // langsung set initial (tidak panggil updateStock supaya tidak duplikat masukSupplier)
    meta.masukSupplier = qty;
    stockData[branch][code] = qty;

    // refresh UI & persist
    try {
      refreshQtyDisplay();
      updateInventorySummary();
      await saveItem({
        branch,
        code,
        qty: stockData[branch][code],
        hargaBeliTerakhir: meta.hargaBeliTerakhir || 0,
        name: meta.name || code,
        category: meta.category || "Uncategorized",
        supplier: meta.supplier || "Unknown",
        unit: meta.unit || "-",
      });
    } catch (err) {
      console.error("Failed saving initial item:", err);
    }
  } else {
    // pakai updateStock supaya meta counters konsisten
    await updateStock(branch, code, qty, "supplier");
  }
}

// ===== REFRESH QTY, AVG, HARGA JUAL & PROFIT =====
const PROFIT_TARGET = 0.1; // 10%

function refreshQtyDisplay() {
  const checkedBranches = Array.from(
    document.querySelectorAll(".branch-checkbox:checked")
  ).map((cb) => cb.dataset.branch);

  const multiple = checkedBranches.length > 1;

  document.querySelectorAll("#item-rows > div").forEach((row) => {
    const code = row.dataset.code;
    let totalQty = 0,
      totalMasuk = 0,
      totalKeluar = 0,
      totalCost = 0,
      totalQtyForAverage = 0;

    // ✅ Total Qty dari semua cabang terpilih
    checkedBranches.forEach((branch) => {
      if (stockData[branch] && stockData[branch][code] !== undefined) {
        totalQty += stockData[branch][code] || 0;
      }
    });

    if (multiple) {
      // ✅ Jika multi cabang → Masuk & Keluar hanya ambil dari Gudang Utama
      const branch = "Gudang Utama";
      if (stockMeta[branch] && stockMeta[branch][code]) {
        const meta = stockMeta[branch][code];
        totalMasuk = meta.masukSupplier + meta.masukTransfer || 0;
        totalKeluar = meta.keluar || 0;
        totalCost = meta.totalCost || 0;
        totalQtyForAverage = meta.totalQty || 0;
      }
    } else {
      // ✅ Jika hanya 1 cabang → ambil semua datanya
      checkedBranches.forEach((branch) => {
        if (stockMeta[branch] && stockMeta[branch][code]) {
          const meta = stockMeta[branch][code];
          totalMasuk += meta.masukSupplier + meta.masukTransfer || 0;
          totalKeluar += meta.keluar || 0;
          totalCost += meta.totalCost || 0;
          totalQtyForAverage += meta.totalQty || 0;
        }
      });
    }

    // ===== UPDATE TAMPILAN KOLOM =====
    // Qty
    if (row.children[3])
      row.children[3].textContent =
        Math.floor(totalQty).toLocaleString("id-ID");

    // Masuk
    if (row.children[5])
      row.children[5].textContent =
        Math.floor(totalMasuk).toLocaleString("id-ID");

    // Keluar
    if (row.children[6])
      row.children[6].textContent =
        Math.floor(totalKeluar).toLocaleString("id-ID");

    // Harga Beli Terakhir
    let lastPrice = 0;
    checkedBranches.forEach((branch) => {
      if (stockMeta[branch] && stockMeta[branch][code]) {
        lastPrice = stockMeta[branch][code].hargaBeliTerakhir || 0;
      }
    });
    if (row.children[7])
      row.children[7].textContent =
        Math.floor(lastPrice).toLocaleString("id-ID");

    // Average Harga
    const avgPrice =
      totalQtyForAverage > 0 ? totalCost / totalQtyForAverage : 0;
    if (row.children[8])
      row.children[8].textContent =
        Math.floor(avgPrice).toLocaleString("id-ID");

    // Harga Jual (Avg + 10%)
    const hargaJual = avgPrice > 0 ? avgPrice * (1 + PROFIT_TARGET) : 0;
    if (row.children[9])
      row.children[9].textContent = hargaJual
        ? Math.floor(hargaJual).toLocaleString("id-ID")
        : "-";

    // Profit
    const profit = avgPrice > 0 ? avgPrice * PROFIT_TARGET : 0;
    if (row.children[10])
      row.children[10].textContent = profit
        ? Math.floor(profit).toLocaleString("id-ID")
        : "-";

    // ✅ Update Status
    updateStatusDisplay(row, totalQty);
  });
}

// ===== UPDATE STATUS DISPLAY =====
function updateStatusDisplay(row, qty) {
  const statusCell = row.children[row.children.length - 1];
  if (!statusCell) return;

  let span = statusCell.querySelector("span");
  if (!span) {
    span = document.createElement("span");
    statusCell.appendChild(span);
  }

  if (qty <= 0) {
    span.textContent = "Kosong";
    span.className = "bg-gray-200 text-gray-700 px-2 py-1 rounded";
  } else if (qty < 10) {
    span.textContent = "Low";
    span.className = "bg-red-100 text-red-700 px-2 py-1 rounded";
  } else {
    span.textContent = "Normal";
    span.className = "bg-green-100 text-green-700 px-2 py-1 rounded";
  }
}

// ===== CABANG UI =====
branchBtn?.addEventListener("click", () =>
  branchList.classList.toggle("hidden")
);

document.addEventListener("click", (e) => {
  if (!branchBtn.contains(e.target) && !branchList.contains(e.target))
    branchList.classList.add("hidden");
});

addBranchBtn?.addEventListener("click", () => {
  branchModal.classList.remove("hidden");
  branchList.classList.add("hidden");
});

cancelBranchBtn?.addEventListener("click", () => {
  branchModal.classList.add("hidden");
  branchForm.reset();
});

branchModal?.addEventListener("click", (e) => {
  if (e.target === branchModal) {
    branchModal.classList.add("hidden");
    branchForm.reset();
  }
});

// 🔧 perbaikan: update cabang asal + tujuan
function updateBranchSelectOptions(branchName) {
  // daftar semua select cabang
  const selectors = [
    'select[name="branch"]', // cabang asal
    'select[name="branch_tujuan"]', // cabang tujuan transfer
    "#sales-branch", // cabang di sales chart
    // kalau ada select lain, tambahin aja di sini
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((select) => {
      // cek apakah opsi sudah ada
      const exists = Array.from(select.options).some(
        (opt) => opt.value === branchName
      );
      if (!exists) {
        const option = document.createElement("option");
        option.value = branchName;
        option.textContent = branchName;
        select.appendChild(option);
      }
    });
  });
  document.querySelectorAll('select[name="branch"]').forEach((select) => {
    if (!Array.from(select.options).some((opt) => opt.value === branchName)) {
      const option = document.createElement("option");
      option.value = branchName;
      option.textContent = branchName;
      select.appendChild(option);
    }
  });
}

branchForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const branchName = branchForm["branch-name"].value.trim();
  if (!branchName) return;

  const existing = branchContainer.querySelectorAll("input[data-branch]");
  for (let input of existing) {
    if (input.dataset.branch.toLowerCase() === branchName.toLowerCase()) {
      alert("Cabang sudah ada!");
      return;
    }
  }

  // Tambah checkbox cabang baru
  const label = document.createElement("label");
  label.className = "flex items-center gap-2";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "form-checkbox text-blue-600 branch-checkbox";
  checkbox.dataset.branch = branchName;
  checkbox.checked = true;
  checkbox.addEventListener("change", refreshQtyDisplay);
  const span = document.createElement("span");
  span.className = "text-sm";
  span.textContent = branchName;
  label.appendChild(checkbox);
  label.appendChild(span);
  branchContainer.appendChild(label);

  // Update data & dropdown
  ensureBranchInStockData(branchName);
  updateBranchSelectOptions(branchName);

  // ✅ Simpan cabang ke Supabase
  const ok = await saveBranch(branchName);
  if (!ok) {
    alert("Gagal simpan cabang ke database!");
  }

  // Tutup modal
  branchModal.classList.add("hidden");
  branchForm.reset();
  refreshQtyDisplay();
});

// refresh stok saat centang cabang berubah
document
  .querySelectorAll(".branch-checkbox")
  .forEach((cb) => cb.addEventListener("change", refreshQtyDisplay));

// ===== TABS =====
const tabButtons = document.querySelectorAll(".tab-btn");
const formSections = document.querySelectorAll(".form-section");
function setActiveTab(activeBtn) {
  tabButtons.forEach((btn) => {
    btn.classList.remove("border-primary", "text-primary", "font-semibold");
    btn.classList.add("border-transparent", "text-gray-600");
  });
  activeBtn.classList.remove("border-transparent", "text-gray-600");
  activeBtn.classList.add("border-primary", "text-primary", "font-semibold");
}
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn);
    formSections.forEach((sec) => sec.classList.add("hidden"));
    const id = `form-${btn.dataset.form}`;
    document.getElementById(id)?.classList.remove("hidden");
  });
});
if (tabButtons.length > 0) {
  setActiveTab(tabButtons[0]);
  formSections.forEach((sec) => sec.classList.add("hidden"));
  document
    .getElementById(`form-${tabButtons[0].dataset.form}`)
    ?.classList.remove("hidden");
}

// ===== CATEGORY =====
function addCategoryButton(categoryName) {
  if (!categoryContainer) return;

  const name = (categoryName || "Uncategorized").toString().trim();
  const key = name.toLowerCase();

  if (categoryContainer.querySelector(`[data-category-btn="${key}"]`)) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.categoryBtn = key;
  btn.textContent = name;
  btn.className =
    "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200";
  categoryContainer.appendChild(btn);
}

if (categoryContainer) {
  const btnAll = document.createElement("button");
  btnAll.type = "button";
  btnAll.dataset.categoryBtn = "all";
  btnAll.textContent = "All";
  // Set All sebagai aktif default
  btnAll.className =
    "px-3 py-1 text-sm bg-primary text-white rounded-full hover:bg-primary/80";
  categoryContainer.appendChild(btnAll);

  categoryContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category-btn]");
    if (!btn) return;

    categoryContainer
      .querySelectorAll("button[data-category-btn]")
      .forEach((b) => {
        b.className =
          "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200";
      });

    btn.className =
      "px-3 py-1 text-sm bg-primary text-white rounded-full hover:bg-primary/80";

    const cat = btn.dataset.categoryBtn;
    filterItemsByCategory(cat);
  });
}

function filterItemsByCategory(cat) {
  const rows = itemGrid ? itemGrid.querySelectorAll("[data-code]") : [];

  rows.forEach((row) => {
    const code = row.dataset.code;
    let itemCategory = "";

    for (const branch in stockMeta) {
      if (stockMeta[branch][code]) {
        itemCategory = (
          stockMeta[branch][code].category || "Uncategorized"
        ).toLowerCase();
        break;
      }
    }

    row.style.display = cat === "all" || itemCategory === cat ? "" : "none";
  });
}
// ===== MODAL =====
function openModal() {
  itemModal?.classList.remove("hidden");
  itemModal?.classList.add("flex");
}
function closeModal() {
  itemModal?.classList.add("hidden");
  itemModal?.classList.remove("flex");
  formSections.forEach((sec) => sec.reset?.());
}
addItemBtn?.addEventListener("click", openModal);
["cancel-item-btn", "cancel-in-btn", "cancel-out-btn"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });
});
itemModal?.addEventListener("click", (e) => {
  if (e.target === itemModal) closeModal();
});
// === HISTORY ===
const historyBtn = document.getElementById("history-btn");
const historyModal = document.getElementById("history-modal");
const closeHistoryBtn = document.getElementById("close-history-btn");

// ===== MODAL HISTORY =====
historyBtn?.addEventListener("click", async () => {
  historyModal.classList.remove("hidden");
  historyModal.classList.add("flex");

  // 🔥 Load data dari Supabase tiap kali dibuka
  await renderHistory();
});
closeHistoryBtn?.addEventListener("click", () => {
  historyModal.classList.add("hidden");
  historyModal.classList.remove("flex");
});
historyModal?.addEventListener("click", (e) => {
  if (e.target === historyModal) {
    historyModal.classList.add("hidden");
    historyModal.classList.remove("flex");
  }
});

// ===== LOAD HISTORY DARI SUPABASE =====
async function loadTransactionsHistory(limit = 100) {
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

// ===== RENDER HISTORY KE TABEL =====
async function renderHistory() {
  const tbody = document.getElementById("history-rows");
  if (!tbody) return;

  tbody.innerHTML =
    "<tr><td colspan='8' class='p-2 text-center'>Loading...</td></tr>";

  const transactions = await loadTransactionsHistory(100);
  console.log("📜 Riwayat:", transactions); // debug

  if (!transactions.length) {
    tbody.innerHTML =
      "<tr><td colspan='8' class='p-2 text-center'>Belum ada data.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  transactions.forEach((t) => {
    const subtotal = t.total || Number(t.qty) * Number(t.price || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 border">${
        t.created_at ? new Date(t.created_at).toLocaleString("id-ID") : "-"
      }</td>
      <td class="p-2 border">${t.code || "-"}</td>
      <td class="p-2 border">${t.name || "-"}</td>
      <td class="p-2 border">${t.branch || "-"}</td>
      <td class="p-2 border">${t.type || "-"}</td>
      <td class="p-2 border">${(t.qty || 0).toLocaleString("id-ID")}</td>
      <td class="p-2 border">Rp ${(t.price || 0).toLocaleString("id-ID")}</td>
      <td class="p-2 border">Rp ${subtotal.toLocaleString("id-ID")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== UTILITY: FORMAT ANGKA DENGAN TITIK =====
function formatNumberInput(input) {
  input.addEventListener("input", () => {
    let val = input.value.replace(/\./g, "").replace(/,/g, ".");
    if (!val) {
      input.value = "";
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    input.value = Math.floor(num).toLocaleString("id-ID").replace(/,/g, ".");
  });
}

// Terapkan ke input angka
["masuk", "keluar", "harga_total"].forEach((name) => {
  const input = document.querySelector(`input[name="${name}"]`);
  if (input) formatNumberInput(input);
});

// ===== INVOICE TRANSFER BARANG =====

// Simpan semua item transfer dalam array (untuk form-out manual)
let invoiceTransferItems = [];
let invoiceTransferCounter = 1;

// Simpan data item ke invoice transfer (dipanggil dari form-out submit jika jenis transfer)
function saveInvoiceTransferData({
  code,
  name,
  qty,
  fromBranch,
  toBranch,
  harga,
}) {
  invoiceTransferItems.push({ code, name, qty, fromBranch, toBranch, harga });
  document.getElementById("show-invoice-btn")?.removeAttribute("disabled");
}

// ===== Helper: Label tanggal/periode =====
function getDateLabel(mode) {
  const now = new Date();

  if (mode === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${first.toLocaleDateString("id-ID")} – ${last.toLocaleDateString(
      "id-ID"
    )}`;
  }

  return now.toLocaleDateString("id-ID");
}

// ====== GENERATOR UTAMA ======
function renderInvoiceTransfer(items, mode = "local") {
  if (!items || items.length === 0) {
    document.getElementById("invoice-transfer-content").innerHTML =
      "<p>Belum ada invoice transfer</p>";
    return;
  }

  const invoiceId =
    (mode === "month" ? "OUT-MONTH-" : "OUT-") +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" +
    invoiceTransferCounter++;

  const dateLabel = getDateLabel(mode);

  // meta untuk tanda tangan
  const invoiceMeta = {
    createdBy: "Makmoer Staf",
    approvedBy: "Manager",
  };

  let rowsHtml = "";
  let grandTotal = 0;

  items.forEach((item) => {
    const harga = Number(item.harga) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = qty * harga;
    grandTotal += subtotal;

    rowsHtml += `
      <tr>
        <td class="border px-2 py-1">${item.code}</td>
        <td class="border px-2 py-1">${item.name || "-"}</td>
        <td class="border px-2 py-1">${
          item.toBranch || item.to_branch || "-"
        }</td>
        <td class="border px-2 py-1">${qty}</td>
        <td class="border px-2 py-1">Rp ${harga.toLocaleString("id-ID")}</td>
        <td class="border px-2 py-1">Rp ${subtotal.toLocaleString("id-ID")}</td>
      </tr>
    `;
  });

  // HTML invoice transfer
  const html = `
    <style>
      @media print { .no-print { display: none !important; } }
    </style>

    <div style="font-family: Arial, sans-serif;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="aset/Logo_Aja.png" style="max-height:100px;" alt="Logo"/>
      </div>

      <p><strong>Invoice Barang Keluar:</strong> ${invoiceId}</p>
      <p style="display:flex; align-items:center; gap:8px;">
        <strong>Tanggal:</strong>
        <span id="invoice-date">${dateLabel}</span>
        <select id="invoice-filter" class="no-print" style="padding:2px 6px; font-size:12px;">
          <option value="today" ${
            mode === "today" ? "selected" : ""
          }>Hari Ini</option>
          <option value="month" ${
            mode === "month" ? "selected" : ""
          }>Bulan Ini</option>
          <option value="local" ${
            mode === "local" ? "selected" : ""
          }>Manual</option>
        </select>
      </p>

      <hr class="my-2"/>

      <table style="border-collapse: collapse; width:100%; font-size:13px;" border="1" cellspacing="0" cellpadding="5">
        <thead style="background:#f0f0f0;">
          <tr>
            <th>Kode</th><th>Nama</th><th>Tujuan</th><th>Qty</th><th>Harga</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right; font-weight:bold;">TOTAL</td>
            <td style="font-weight:bold;">Rp ${grandTotal.toLocaleString(
              "id-ID"
            )}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:50px; text-align:center; font-size:13px; margin-top:120px;">
        <div>
          <p>Created By,</p><br><br><br>
          <p>( ${invoiceMeta.createdBy || "........"} )</p>
        </div>
        <div>
          <p>Approved By,</p><br><br><br>
          <p>( ${invoiceMeta.approvedBy || "........"} )</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("invoice-transfer-content").innerHTML = html;

  // re-attach listener dropdown (karena di-render ulang)
  document
    .getElementById("invoice-filter")
    ?.addEventListener("change", async (e) => {
      await loadAndRenderInvoice(e.target.value);
    });
}

// ====== LOAD + RENDER ======
async function loadAndRenderInvoice(mode = "today") {
  if (mode === "local") {
    renderInvoiceTransfer(invoiceTransferItems, "local");
    return;
  }

  let transfers = [];
  try {
    if (mode === "today") {
      transfers = await loadTodayTransfers(); // dari supabase.js
    } else if (mode === "month") {
      transfers = await loadMonthlyTransfers(); // dari supabase.js
    }
  } catch (err) {
    console.error("Gagal load transfers:", err);
    transfers = [];
  }

  const itemsRaw = (transfers || []).map((t) => ({
    code: t.code || "-",
    name: t.name || "-",
    toBranch: t.to_branch || "-",
    qty: Number(t.qty) || 0,
    harga: Number(t.price) || 0,
  }));

  // 🔥 Gabung per code + harga + tujuan
  const grouped = {};
  itemsRaw.forEach((item) => {
    const key = `${item.code}_${item.harga}_${item.toBranch}`;
    if (!grouped[key]) {
      grouped[key] = { ...item };
    } else {
      grouped[key].qty += item.qty; // jumlahkan qty
    }
  });

  const items = Object.values(grouped);

  renderInvoiceTransfer(items, mode);
}

// ====== EVENT ======
document
  .getElementById("show-invoice-btn")
  ?.addEventListener("click", async () => {
    document
      .getElementById("invoice-transfer-modal")
      .classList.remove("hidden");
    await loadAndRenderInvoice("today"); // default hari ini
  });

document
  .getElementById("close-invoice-transfer-btn")
  ?.addEventListener("click", () => {
    document.getElementById("invoice-transfer-modal").classList.add("hidden");
  });

document
  .getElementById("print-invoice-transfer-btn")
  ?.addEventListener("click", () => {
    const invoiceContent = document.getElementById(
      "invoice-transfer-content"
    ).innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
    <html>
      <head>
        <title>Invoice Transfer Barang</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: center; }
          th { background: #f0f0f0; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>${invoiceContent}</body>
    </html>
  `);
    printWindow.document.close();
    printWindow.print();
  });

// === RENDER ITEM ROW (tabel stok utama) ===
function renderItemRow({ code, name, supplier, category, unit, branch, qty }) {
  const itemRow = document.createElement("div");
  itemRow.className =
    "grid grid-cols-12 border-b border-gray-200 text-sm items-center";
  itemRow.dataset.code = code;
  itemRow.dataset.category = category || "Uncategorized";
  itemRow.dataset.unit = unit;

  itemRow.innerHTML = `
    <div class="p-3">${code}</div>
    <div class="p-3">${name}</div>
    <div class="p-3">${supplier}</div>
    <div class="p-3">${qty}</div>
    <div class="p-3">${unit}</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3"></div>
  `;

  itemGrid.appendChild(itemRow);
}

// ===== FORM: ADD ITEM =====
document.getElementById("form-add")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "No Code").toString().trim();
  const name = (fd.get("name") || "No Name").toString().trim();
  const category = (fd.get("category") || "Uncategorized").toString().trim();
  const unit = (fd.get("unit") || "-").toString().trim();
  const supplier = (fd.get("supplier") || "Unknown").toString().trim();

  const branch = "Gudang Utama";
  const qty = 0;

  // ✅ update meta name biar konsisten
  ensureCodeMeta(branch, code);
  stockMeta[branch][code].name = name;
  stockMeta[branch][code].category = category;
  stockMeta[branch][code].supplier = supplier;
  stockMeta[branch][code].unit = unit;

  // 🔹 render row baru ke UI
  renderItemRow({ code, name, supplier, qty, category, unit, branch });

  // 🔹 simpan ke Supabase
  await saveItem({
    branch,
    code,
    qty,
    hargaBeliTerakhir: 0,
    name,
    category,
    supplier,
    unit,
  });

  addCategoryButton(category);
  refreshQtyDisplay();
  updateInventorySummary();

  e.target.reset();
  closeModal();
});

// ===== FORM: BARANG MASUK =====
document.getElementById("form-in")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const branch = (fd.get("branch") || "Gudang Utama").trim();
  const masuk =
    parseInt((fd.get("masuk") || "0").toString().replace(/\./g, "")) || 0;
  const hargaTotal =
    parseInt((fd.get("harga_total") || "0").toString().replace(/\./g, "")) || 0;
  const name = (fd.get("name") || "").trim();

  let supplier = "Unknown";
  let unit = "-";
  const row = document.querySelector(`#item-rows > div[data-code="${code}"]`);
  if (row) {
    supplier = row.children[2]?.textContent.trim() || "Unknown";
    unit = row.children[4]?.textContent.trim() || "-";
  }

  if (branch !== "Gudang Utama") {
    alert(
      "Barang masuk hanya bisa ke Gudang Utama. Gunakan form Barang Keluar untuk transfer!"
    );
    return;
  }

  if (!code || masuk <= 0 || hargaTotal <= 0) {
    alert("Mohon isi semua field dengan benar!");
    return;
  }

  const hargaSatuan = hargaTotal / masuk;

  // ✅ update meta name biar konsisten
  ensureCodeMeta(branch, code);
  const meta = stockMeta[branch][code];
  meta.name = name;
  meta.totalCost += hargaTotal;
  meta.totalQty += masuk;
  meta.hargaBeliTerakhir = hargaSatuan;
  meta.supplier = supplier;
  meta.unit = unit;

  await updateStock(branch, code, masuk, "supplier");

  const ok = await saveTransaction({
    code,
    name,
    branch,
    type: "in",
    qty: masuk,
    price: hargaSatuan,
    total: hargaTotal,
    note: supplier,
  });
  if (!ok) alert("❌ Gagal simpan transaksi ke database!");

  if (!hargaBeliData[code]) hargaBeliData[code] = [];
  hargaBeliData[code].push({
    tanggal: new Date().toLocaleDateString("id-ID"),
    harga: hargaSatuan,
  });

  updateHargaBeliDropdown(code, name);

  const selected = document.getElementById("hargaBeliSelect").value;
  if (selected === code) renderHargaBeliChart(code);
  else setDefaultHargaBeliChart();

  updateInventorySummary();

  e.target.reset();
  closeModal();
});

// ===== FORM: BARANG KELUAR =====
let transferCount = 0; // counter global pindah stok

document.getElementById("form-out")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const branch = (fd.get("branch") || "Gudang Utama").trim(); // cabang asal
  const keluar =
    parseInt((fd.get("keluar") || "0").toString().replace(/\./g, "")) || 0;
  const jenis = (fd.get("jenis_keluar") || "penjualan").trim();
  const tujuan = (fd.get("branch_tujuan") || "").trim(); // cabang tujuan
  const row = document.querySelector(`#item-rows > div[data-code="${code}"]`);

  const name = row?.children[1]?.textContent.trim() || "Unknown";
  const supplier = row?.children[2]?.textContent.trim() || "Unknown";
  const unit = row?.children[4]?.textContent.trim() || "-";

  if (!code || keluar <= 0) {
    alert("Mohon isi semua field dengan benar!");
    return;
  }

  // ✅ Pastikan meta stok asal lengkap
  ensureCodeMeta(branch, code);
  stockMeta[branch][code].name = name; // <--- fix disini
  stockMeta[branch][code].supplier = supplier;
  stockMeta[branch][code].unit = unit;

  const hargaKeluar = stockMeta[branch]?.[code]?.hargaBeliTerakhir || 0;
  const totalKeluar = keluar * hargaKeluar;

  if (jenis === "penjualan") {
    await updateStock(branch, code, -keluar);
    await saveTransaction({
      code,
      name,
      branch,
      type: "out",
      qty: keluar,
      price: hargaKeluar,
      total: totalKeluar,
      note: "Penjualan",
    });
  } else if (jenis === "transfer") {
    if (!tujuan) {
      alert("Pilih cabang tujuan untuk transfer!");
      return;
    }
    if (tujuan === branch) {
      alert("Cabang tujuan tidak boleh sama dengan cabang asal!");
      return;
    }

    // ✅ Pastikan meta stok tujuan lengkap
    ensureCodeMeta(tujuan, code);
    stockMeta[tujuan][code].name = name; // <--- fix disini
    stockMeta[tujuan][code].supplier = supplier;
    stockMeta[tujuan][code].unit = unit;

    await transferStock(branch, tujuan, code, keluar);
    transferCount++;

    await saveTransaction({
      code,
      name,
      branch,
      toBranch: tujuan,
      type: "transfer",
      qty: keluar,
      price: hargaKeluar,
      total: totalKeluar,
      note: "Transfer antar cabang",
    });

    saveInvoiceTransferData({
      code,
      name,
      qty: keluar,
      fromBranch: branch,
      toBranch: tujuan,
      harga: hargaKeluar,
    });
  }

  updateTransferKPI();

  if (!stockMovements[code]) stockMovements[code] = 0;
  stockMovements[code] += keluar;
  updateTopStockChart();

  updateInventorySummary();

  e.target.reset();
  closeModal();
});

// ===== UI: Show/Hide Cabang Tujuan =====
const jenisKeluarSelect = document.getElementById("jenis-keluar");
const branchSelect = document.querySelector('select[name="branch"]'); // cabang asal
const branchTujuanSelect = document.getElementById("branch-tujuan");

jenisKeluarSelect?.addEventListener("change", () => {
  if (jenisKeluarSelect.value === "transfer") {
    // tampilkan dropdown tujuan
    branchTujuanSelect.classList.remove("hidden");

    // ambil cabang asal yang dipilih user
    const asal = branchSelect?.value || "Gudang Utama";

    // refresh opsi tujuan: tampilkan semua kecuali asal
    Array.from(branchTujuanSelect.options).forEach((opt) => {
      if (opt.value === asal) {
        opt.classList.add("hidden"); // sembunyikan opsi cabang asal
      } else {
        opt.classList.remove("hidden");
      }
    });

    // reset pilihan kalau user sebelumnya pilih cabang asal
    if (branchTujuanSelect.value === asal) {
      branchTujuanSelect.value = "";
    }
  } else {
    // kalau bukan transfer → sembunyikan dropdown tujuan
    branchTujuanSelect.classList.add("hidden");
    branchTujuanSelect.value = "";
  }
});

// ===== AUTO-FILL DUA ARAH =====
function setupAutoFill(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const nameInput = form.querySelector('input[name="name"]');
  const codeInput = form.querySelector('input[name="code"]');
  if (!nameInput || !codeInput) return;

  // name → code
  nameInput.addEventListener("input", () => {
    const nameVal = nameInput.value.trim().toLowerCase();
    if (!nameVal) {
      codeInput.value = "";
      return;
    }
    let foundCode = "";
    document.querySelectorAll("#item-rows > div").forEach((row) => {
      const rowName = row.children[1].textContent.trim().toLowerCase();
      const rowCode = row.children[0].textContent.trim();
      if (rowName === nameVal) foundCode = rowCode;
    });
    codeInput.value = foundCode;
  });

  // code → name
  codeInput.addEventListener("input", () => {
    const codeVal = codeInput.value.trim();
    if (!codeVal) {
      nameInput.value = "";
      return;
    }
    let foundName = "";
    document.querySelectorAll("#item-rows > div").forEach((row) => {
      const rowCode = row.children[0].textContent.trim();
      const rowName = row.children[1].textContent.trim();
      if (rowCode === codeVal) foundName = rowName;
    });
    nameInput.value = foundName;
  });
}

setupAutoFill("form-in");
setupAutoFill("form-out");
// === STATISTIC SECTION ===

// === UPDATE KPI TRANSFER (ambil dari Supabase) ===
async function updateTransferKPI() {
  const todayEl = document.getElementById("today-transfers");
  const weekEl = document.getElementById("week-transfers");
  const monthEl = document.getElementById("month-transfers");

  if (!todayEl || !weekEl || !monthEl) return;

  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // minggu
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // 🔹 Ambil transaksi transfer dari Supabase
  const { data, error } = await supabase
    .from("transactions")
    .select("created_at")
    .eq("type", "transfer");

  if (error) {
    console.error("❌ KPI Transfer error:", error.message);
    return;
  }

  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;

  data.forEach((t) => {
    const d = new Date(t.created_at);
    if (d >= startOfDay && d <= endOfDay) todayTotal++;
    if (d >= startOfWeek && d <= endOfWeek) weekTotal++;
    if (d >= startOfMonth && d <= endOfMonth) monthTotal++;
  });

  todayEl.textContent = todayTotal;
  weekEl.textContent = weekTotal;
  monthEl.textContent = monthTotal;
}

// === TREN HARGA BELI ===
let hargaBeliData = {}; // { kodeProduk: [{tanggal, hargaPerUnit}] }
let hargaBeliChart;

function initHargaBeliChart() {
  const ctx = document.getElementById("hargaBeliChart").getContext("2d");
  hargaBeliChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Harga Beli",
          data: [],
          borderColor: "#1A2A80",
          backgroundColor: "rgba(26,42,128,0.1)",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Tanggal" } },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Harga (Rp)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => "Rp " + ctx.raw.toLocaleString("id-ID"),
          },
        },
      },
    },
  });
}
initHargaBeliChart();

// isi dropdown produk berdasarkan input barang masuk
function updateHargaBeliDropdown(code, name) {
  const select = document.getElementById("hargaBeliSelect");
  if (!select.querySelector(`option[value="${code}"]`)) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} - ${name}`;
    select.appendChild(opt);
  }
}

// update chart sesuai produk dipilih
document.getElementById("hargaBeliSelect")?.addEventListener("change", (e) => {
  const code = e.target.value;
  renderHargaBeliChart(code);
});

// === Fungsi render chart berdasarkan kode produk ===
function renderHargaBeliChart(code) {
  if (!code || !hargaBeliData[code] || hargaBeliData[code].length === 0) {
    hargaBeliChart.data.labels = [];
    hargaBeliChart.data.datasets[0].data = [];
  } else {
    const list = hargaBeliData[code];
    hargaBeliChart.data.labels = list.map((d) => d.tanggal);
    hargaBeliChart.data.datasets[0].data = list.map((d) => d.harga);
  }
  hargaBeliChart.update();
}

// === Cari produk yang paling sering dibeli ===
function getMostFrequentProduct() {
  let maxCode = null;
  let maxCount = 0;
  for (const code in hargaBeliData) {
    const count = hargaBeliData[code].length;
    if (count > maxCount) {
      maxCode = code;
      maxCount = count;
    }
  }
  return maxCode;
}

// === Set default chart berdasarkan produk paling sering dibeli ===
function setDefaultHargaBeliChart() {
  const bestCode = getMostFrequentProduct();
  if (bestCode) {
    const select = document.getElementById("hargaBeliSelect");
    select.value = bestCode;
    renderHargaBeliChart(bestCode);
  }
}

// === LOAD DATA HARGA BELI dari transaksi "in" ===
async function loadHargaBeliData() {
  const { data, error } = await supabase
    .from("transactions")
    .select("code, name, price, created_at")
    .eq("type", "in")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ Load Harga Beli error:", error.message);
    return;
  }

  hargaBeliData = {};
  data.forEach((t) => {
    if (!hargaBeliData[t.code]) hargaBeliData[t.code] = [];
    hargaBeliData[t.code].push({
      tanggal: new Date(t.created_at).toLocaleDateString("id-ID"),
      harga: t.price || 0,
    });
    updateHargaBeliDropdown(t.code, t.name);
  });

  setDefaultHargaBeliChart();
}

// jalankan saat halaman load
document.addEventListener("DOMContentLoaded", async () => {
  await updateTransferKPI();
  await loadHargaBeliData();
});

// === SALES CHART ===

// === SIMPAN LAPORAN MANUAL ===
let branchSalesRecords = [];
let currentView = "month"; // default view

// === TOGGLE KEBAB MENU ===
const kebabBtn = document.getElementById("kebabBtn");
const kebabMenu = document.getElementById("kebabMenu");

if (kebabBtn && kebabMenu) {
  kebabBtn.addEventListener("click", () => {
    kebabMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!kebabBtn.contains(e.target) && !kebabMenu.contains(e.target)) {
      kebabMenu.classList.add("hidden");
    }
  });
}

// === UPLOAD CSV (manual input penjualan) ===
const uploadCsv = document.getElementById("uploadCsv");
if (uploadCsv) {
  uploadCsv.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
      const lines = evt.target.result.split("\n").map((l) => l.trim());
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (!line || idx === 0) continue; // skip header

        const [date, branch, amountRaw] = line.split(",");
        const amount = parseInt(String(amountRaw || "").replace(/\D/g, ""), 10);

        if (date && branch && !isNaN(amount)) {
          const record = { date: date.trim(), branch: branch.trim(), amount };
          branchSalesRecords.push(record);

          // 🔹 Simpan ke Supabase
          await supabase.from("sales_reports").insert([record]);
        }
      }
      updateBranchChartFromRecords();
    };
    reader.readAsText(file);
  });
}

// === INIT CHART KOSONG ===
const ctxBranch = document.getElementById("branchChart");
const branchChart = new Chart(ctxBranch, {
  type: "line",
  data: { datasets: [] },
  options: {
    responsive: true,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 10,
          boxHeight: 10,
          color: "#444",
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return (
              context.dataset.label +
              ": Rp " +
              new Intl.NumberFormat("id-ID").format(value)
            );
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: false }, pinch: { enabled: false } },
      },
    },
    scales: {
      x: { type: "time", time: { unit: "day", tooltipFormat: "dd MMM yyyy" } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) =>
            "Rp " + new Intl.NumberFormat("id-ID").format(value),
        },
      },
    },
  },
});

// 🔹 Scroll → jadi geser (bukan zoom)
ctxBranch.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaX !== 0) branchChart.pan({ x: e.deltaX });
});

// Optional: tombol reset zoom
function resetZoom() {
  if (branchChart?.resetZoom) branchChart.resetZoom();
}

// === UPDATE CHART DARI branchSalesRecords (multi cabang) ===
function updateBranchChartFromRecords(view = currentView) {
  currentView = view;

  const grouped = {};
  branchSalesRecords.forEach((r) => {
    if (!grouped[r.branch]) grouped[r.branch] = [];
    grouped[r.branch].push(r);
  });

  Object.values(grouped).forEach((records) =>
    records.sort((a, b) => new Date(a.date) - new Date(b.date))
  );

  let dateLabels = [];
  if (view === "month") {
    dateLabels = [...new Set(branchSalesRecords.map((r) => r.date))].sort(
      (a, b) => new Date(a) - new Date(b)
    );
  }

  const colors = ["#1A2A80", "#16A34A", "#EAB308", "#DC2626", "#9333EA"];

  const datasets = Object.keys(grouped).map((branch, i) => {
    let data;
    if (view === "year") {
      const year = new Date().getFullYear();
      data = Array.from({ length: 12 }, (_, idx) => {
        const total = grouped[branch]
          .filter((r) => new Date(r.date).getMonth() === idx)
          .reduce((sum, r) => sum + r.amount, 0);
        return { x: new Date(year, idx, 1), y: total > 0 ? total : null };
      });
    } else {
      data = dateLabels.map((date) => {
        const rec = grouped[branch].find((r) => r.date === date);
        return { x: new Date(date), y: rec ? rec.amount : null };
      });
    }

    return {
      label: branch,
      data,
      borderColor: colors[i % colors.length],
      backgroundColor: "transparent",
      pointBackgroundColor: colors[i % colors.length],
      pointBorderColor: colors[i % colors.length],
      pointRadius: 5,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: false,
    };
  });

  branchChart.data.datasets = datasets;

  if (view === "month" && dateLabels.length > 0) {
    const lastDate = new Date(dateLabels[dateLabels.length - 1]);
    const minDate = new Date(lastDate);
    minDate.setDate(lastDate.getDate() - 14);
    branchChart.options.scales.x.min = minDate;
    branchChart.options.scales.x.max = lastDate;
  } else {
    branchChart.options.scales.x.min = null;
    branchChart.options.scales.x.max = null;
  }

  branchChart.update();
}

// === FORMAT INPUT Rp ===
const amountInput = document.getElementById("sales-amount");
if (amountInput) {
  amountInput.addEventListener("input", function () {
    let value = this.value.replace(/[^0-9]/g, "");
    this.value = value ? new Intl.NumberFormat("id-ID").format(value) : "";
  });
}

// === LOAD CABANG UNTUK DROPDOWN ===
async function loadBranchesForSales() {
  const { data, error } = await supabase.from("branches").select("name");
  if (error) {
    console.error("Load branches error:", error.message);
    return;
  }
  const select = document.getElementById("sales-branch");
  select.innerHTML = "";
  data.forEach((b) => {
    if (b.name !== "Gudang Utama") {
      const option = document.createElement("option");
      option.value = b.name;
      option.textContent = b.name;
      select.appendChild(option);
    }
  });
}
document.addEventListener("DOMContentLoaded", loadBranchesForSales);

// === HANDLE FORM SUBMIT ===
const salesForm = document.getElementById("sales-form");
if (salesForm) {
  salesForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const date = document.getElementById("sales-date").value;
    const amount = parseInt(
      document
        .getElementById("sales-amount")
        .value.replace(/\./g, "")
        .replace(/,/g, ""),
      10
    );
    const branch = document.getElementById("sales-branch").value;

    if (date && !isNaN(amount) && branch) {
      const record = { date, branch, amount };
      branchSalesRecords.push(record);

      // 🔹 Simpan ke Supabase
      const { error } = await supabase.from("sales_reports").insert([record]);
      if (error) console.error("Gagal simpan sales:", error.message);

      updateBranchChartFromRecords(currentView);
    }
    this.reset();
  });
}

// === LOAD SALES AWAL DARI SUPABASE ===
async function loadSalesReports() {
  const { data, error } = await supabase
    .from("sales_reports")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("Gagal load sales reports:", error.message);
    return;
  }

  branchSalesRecords = data || [];
  updateBranchChartFromRecords("month");
}
document.addEventListener("DOMContentLoaded", loadSalesReports);

// === EVENT LISTENER UNTUK TOGGLE VIEW ===
const btnMonth = document.getElementById("btn-month");
const btnYear = document.getElementById("btn-year");

if (btnMonth)
  btnMonth.addEventListener("click", () =>
    updateBranchChartFromRecords("month")
  );
if (btnYear)
  btnYear.addEventListener("click", () => updateBranchChartFromRecords("year"));

// 🔹 default load
updateBranchChartFromRecords("month");

// === TOP STOCK MOVEMENTS ===
let stockMovements = {};
let topStockChart;

let currentRange = "1m";
let currentCategory = "all";
let currentItem = "all";

// === INIT CHART ===
function initTopStockChart() {
  const ctx = document.getElementById("topStockChart")?.getContext("2d");
  if (!ctx) return;

  topStockChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Qty",
          data: [],
          backgroundColor: "#1A2A80",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.raw.toLocaleString("id-ID") + " pcs",
          },
        },
      },
      scales: {
        x: { title: { display: false } },
        y: { beginAtZero: true, title: { display: true, text: "Jumlah" } },
      },
    },
  });
}
initTopStockChart();

// === FILTER MENU TOGGLE ===
const filterBtn = document.getElementById("adjustButton");
const filterMenu = document.getElementById("adjustMenu");

if (filterBtn && filterMenu) {
  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!filterMenu.contains(e.target) && !filterBtn.contains(e.target)) {
      filterMenu.classList.add("hidden");
    }
  });
}

// === POPULATE FILTER DROPDOWN ===
async function populateCategories() {
  const { data, error } = await supabase.from("items").select("category");
  if (error) {
    console.error("Load categories error:", error.message);
    return;
  }
  const categories = [...new Set(data.map((i) => i.category).filter(Boolean))];
  const categorySelect = document.getElementById("filter-category");
  categorySelect.innerHTML = `<option value="all">All Kategori</option>`;
  categories.forEach((cat) => {
    categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

async function populateItems(category) {
  let query = supabase.from("items").select("code,name,category");
  if (category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("Load items error:", error.message);
    return;
  }
  const itemSelect = document.getElementById("filter-item");
  itemSelect.innerHTML = `<option value="all">All Item</option>`;
  data.forEach((it) => {
    itemSelect.innerHTML += `<option value="${it.code}">${it.name}</option>`;
  });
}

// === AMBIL DATA TOP STOCK dari Supabase ===
async function loadTopStockMovements(
  range = currentRange,
  category = currentCategory,
  item = currentItem
) {
  try {
    // 🔹 ambil mapping code -> category dari items
    const { data: items, error: itemError } = await supabase
      .from("items")
      .select("code, category, name");
    if (itemError) throw itemError;

    const itemMap = {};
    items.forEach((it) => {
      itemMap[it.code] = { category: it.category, name: it.name };
    });

    // 🔹 ambil transaksi
    let query = supabase
      .from("transactions")
      .select("code, name, qty, created_at")
      .eq("type", "transfer");

    // Range waktu
    const today = new Date();
    let startDate = new Date();
    if (range === "3d") startDate.setDate(today.getDate() - 3);
    if (range === "7d") startDate.setDate(today.getDate() - 7);
    if (range === "14d") startDate.setDate(today.getDate() - 14);
    if (range === "1m") startDate.setMonth(today.getMonth() - 1);

    query = query.gte("created_at", startDate.toISOString());

    const { data: transactions, error } = await query;
    if (error) throw error;

    // 🔹 filter berdasarkan kategori & item
    let filtered = transactions.filter((t) => {
      const itemInfo = itemMap[t.code] || {};
      if (category !== "all" && itemInfo.category !== category) return false;
      if (item !== "all" && t.code !== item) return false;
      return true;
    });

    // 🔹 hitung qty per code
    stockMovements = {};
    filtered.forEach((t) => {
      if (!stockMovements[t.code]) {
        stockMovements[t.code] = {
          qty: 0,
          name: t.name || itemMap[t.code]?.name || t.code,
        };
      }
      stockMovements[t.code].qty += t.qty || 0;
    });

    updateTopStockChart();
  } catch (err) {
    console.error("❌ Load Top Stock error:", err.message || err);
  }
}

// === UPDATE CHART ===
function updateTopStockChart() {
  const list = Object.entries(stockMovements).map(([code, obj]) => ({
    code,
    name: obj.name || code,
    qty: obj.qty,
  }));

  // urutkan terbesar → terkecil
  list.sort((a, b) => b.qty - a.qty);

  // ambil 5 teratas
  const top5 = list.slice(0, 5);

  if (topStockChart) {
    topStockChart.data.labels = top5.map((m) => m.name);
    topStockChart.data.datasets[0].data = top5.map((m) => m.qty);
    topStockChart.update();
  }
}

// === EVENT FILTER ===
document.getElementById("filter-category")?.addEventListener("change", (e) => {
  currentCategory = e.target.value;
  populateItems(currentCategory);
  loadTopStockMovements(currentRange, currentCategory, currentItem);
});

document.getElementById("filter-item")?.addEventListener("change", (e) => {
  currentItem = e.target.value;
  loadTopStockMovements(currentRange, currentCategory, currentItem);
});

document.querySelectorAll("[data-range]")?.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentRange = btn.dataset.range;
    loadTopStockMovements(currentRange, currentCategory, currentItem);
  });
});

// === INITIAL LOAD ===
document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
  populateItems("all");
  loadTopStockMovements();
});
