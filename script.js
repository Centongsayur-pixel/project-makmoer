// === Bottom Navigation ===
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
// ===== INVENTORY SUMMARY =====
function updateInventorySummary() {
  const categoriesEl = document.getElementById("summary-categories");
  const branchesEl = document.getElementById("summary-branches");
  const qtyEl = document.getElementById("summary-total-qty");
  const valueEl = document.getElementById("summary-total-value");
  const lowStockEl = document.getElementById("low-stock-count");
  const stockMoveEl = document.getElementById("stock-move-count");
  const qtyChangeEl = document.getElementById("qty-change-count");
  const bestSellerEl = document.getElementById("best-seller-count");

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

  // best seller tracker
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

    // cek best seller berdasarkan keluar
    if (keluar > bestSeller.qty) {
      bestSeller = { name, qty: keluar };
    }
  });

  // hitung jumlah cabang (checkbox cabang)
  const branchCount = document.querySelectorAll(".branch-checkbox").length;

  // update ke UI
  categoriesEl.textContent = categories.size;
  branchesEl.textContent = branchCount;
  qtyEl.textContent = `${totalQty.toLocaleString("id-ID")} Barang`;
  valueEl.textContent = `Rp ${totalValue.toLocaleString("id-ID")}`;
  lowStockEl.textContent = `${lowStockCount} Barang`;
  stockMoveEl.textContent = `${transferCount} Perpindahan`;
  qtyChangeEl.textContent = `${totalChange} Barang`;

  // update best seller
  if (bestSeller.qty > 0) {
    bestSellerEl.textContent = `${bestSeller.name} (${bestSeller.qty})`;
  } else {
    bestSellerEl.textContent = "Belum ada";
  }
}

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

// DATA
let stockData = { "Gudang Utama": {} };
let stockMeta = { "Gudang Utama": {} };
// meta = {masukSupplier, masukTransfer, keluar, totalCost, totalQty, hargaBeliTerakhir}

// ===== UTILITY =====
function ensureBranchInStockData(branchName) {
  if (!stockData[branchName]) stockData[branchName] = {};
  if (!stockMeta[branchName]) stockMeta[branchName] = {};
}
function ensureCodeMeta(branchName, code) {
  ensureBranchInStockData(branchName);
  if (!stockMeta[branchName][code])
    stockMeta[branchName][code] = {
      masukSupplier: 0,
      masukTransfer: 0,
      keluar: 0,
      totalCost: 0,
      totalQty: 0,
      hargaBeliTerakhir: 0,
    };
  if (typeof stockData[branchName][code] === "undefined")
    stockData[branchName][code] = 0;
}

function updateStock(branchName, code, qtyChange, type = "supplier") {
  ensureCodeMeta(branchName, code);
  stockData[branchName][code] += qtyChange;
  if (qtyChange > 0) {
    if (type === "supplier")
      stockMeta[branchName][code].masukSupplier += qtyChange;
    else if (type === "transfer")
      stockMeta[branchName][code].masukTransfer += qtyChange;
  } else if (qtyChange < 0) {
    stockMeta[branchName][code].keluar += Math.abs(qtyChange);
  }
}

function transferStock(fromBranch, toBranch, code, qty) {
  ensureCodeMeta(fromBranch, code);
  ensureCodeMeta(toBranch, code);
  updateStock(fromBranch, code, -qty);
  updateStock(toBranch, code, qty, "transfer");
}

function addInitialStock(branch, code, qty) {
  ensureCodeMeta(branch, code);
  const meta = stockMeta[branch][code];
  const cur = stockData[branch][code] || 0;
  if (
    meta.masukSupplier === 0 &&
    meta.masukTransfer === 0 &&
    meta.keluar === 0 &&
    cur === 0
  ) {
    meta.masukSupplier = qty;
    stockData[branch][code] = qty;
  } else {
    updateStock(branch, code, qty, "supplier");
  }
}

function updateBranchSelectOptions(branchName) {
  document.querySelectorAll('select[name="branch"]').forEach((select) => {
    if (!Array.from(select.options).some((opt) => opt.value === branchName)) {
      const option = document.createElement("option");
      option.value = branchName;
      option.textContent = branchName;
      select.appendChild(option);
    }
  });
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
  // Update dropdown "branch" (cabang asal)
  document.querySelectorAll('select[name="branch"]').forEach((select) => {
    if (!Array.from(select.options).some((opt) => opt.value === branchName)) {
      const option = document.createElement("option");
      option.value = branchName;
      option.textContent = branchName;
      select.appendChild(option);
    }
  });

  // Update dropdown "branch_tujuan" (cabang tujuan transfer)
  document
    .querySelectorAll('select[name="branch_tujuan"]')
    .forEach((select) => {
      if (!Array.from(select.options).some((opt) => opt.value === branchName)) {
        const option = document.createElement("option");
        option.value = branchName;
        option.textContent = branchName;
        select.appendChild(option);
      }
    });
}

branchForm?.addEventListener("submit", (e) => {
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
  const key = String(categoryName).trim().toLowerCase();
  if (!key) return;
  if (categoryContainer.querySelector(`[data-category-btn="${key}"]`)) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.categoryBtn = key;
  btn.textContent = categoryName;
  btn.className =
    "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200";
  categoryContainer.appendChild(btn);
}
if (categoryContainer) {
  const btnAll = document.createElement("button");
  btnAll.type = "button";
  btnAll.dataset.categoryBtn = "all";
  btnAll.textContent = "All";
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
  const rows = itemGrid ? itemGrid.querySelectorAll("[data-category]") : [];
  rows.forEach((row) => {
    const rowCat = (row.dataset.category || "").trim().toLowerCase();
    row.style.display = cat === "all" || rowCat === cat ? "" : "none";
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
historyBtn?.addEventListener("click", () => {
  historyModal.classList.remove("hidden");
  historyModal.classList.add("flex");
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

// ===== HISTORY DATA =====
function addHistoryRow({ date, code, name, branch, type, qty }) {
  const tbody = document.getElementById("history-rows");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="p-2 border">${date}</td>
    <td class="p-2 border">${code}</td>
    <td class="p-2 border">${name}</td>
    <td class="p-2 border">${branch}</td>
    <td class="p-2 border">${type}</td>
    <td class="p-2 border">${qty}</td>
  `;
  tbody.prepend(tr); // prepend biar yang terbaru selalu di atas
}
// ===== UTILITY: FORMAT ANGKA DENGAN TITIK =====
function formatNumberInput(input) {
  input.addEventListener("input", () => {
    let val = input.value.replace(/\./g, "").replace(/,/g, "."); // hapus titik, ubah koma jadi titik
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

// ===== INVOICE BARANG MASUK (MULTI ITEM) =====
function formatRupiah(angka) {
  if (isNaN(angka)) return "0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Simpan semua item invoice dalam array
let invoiceInItems = [];
let invoiceInCounter = 1;

// Simpan data item ke invoice (dipanggil dari form-in submit)
function saveInvoiceInData({
  code,
  name,
  masuk,
  hargaSatuan,
  hargaTotal,
  supplier,
}) {
  invoiceInItems.push({ code, name, masuk, hargaSatuan, hargaTotal, supplier });

  // Aktifkan tombol invoice (kalau awalnya disabled)
  document.getElementById("show-invoice-btn")?.removeAttribute("disabled");
}

// Generate isi invoice ke modal
function generateInvoiceIn() {
  if (invoiceInItems.length === 0) {
    document.getElementById("invoice-in-content").innerHTML =
      "<p>Belum ada invoice</p>";
    return;
  }

  const invoiceId =
    "IN-" +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" +
    invoiceInCounter++;
  const date = new Date().toLocaleDateString("id-ID");

  // meta untuk tanda tangan
  const invoiceMeta = {
    createdBy: "Makmoer Staf", // bisa nanti diganti input user
    approvedBy: "Header", // default kosong
  };

  // generate semua item
  let rowsHtml = "";
  let grandTotal = 0;
  invoiceInItems.forEach((item) => {
    rowsHtml += `
      <tr>
        <td class="border px-2 py-1">${item.code}</td>
        <td class="border px-2 py-1">${item.name}</td>
        <td class="border px-2 py-1">${item.supplier || "-"}</td>
        <td class="border px-2 py-1">${item.masuk}</td>
        <td class="border px-2 py-1">${formatRupiah(item.hargaSatuan)}</td>
        <td class="border px-2 py-1">${formatRupiah(item.hargaTotal)}</td>
      </tr>
    `;
    grandTotal += item.hargaTotal;
  });

  // HTML invoice
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <!-- Logo -->
      <div style="text-align:center; margin-bottom:20px;">
        <img src="aset/Logo_Aja.png" style="max-height:100px;" alt="Logo"/>
      </div>

      <!-- Header -->
      <p><strong>Invoice Masuk:</strong> ${invoiceId}</p>
      <p><strong>Tanggal:</strong> ${date}</p>
      <hr class="my-2"/>

      <!-- Table -->
      <table style="border-collapse: collapse; width:100%; font-size:13px;" border="1" cellspacing="0" cellpadding="5">
        <thead style="background:#f0f0f0;">
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Supplier</th>
            <th>Qty</th>
            <th>Harga</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:center; font-weight:bold;">Total:</td>
            <td style="font-weight:bold;">${formatRupiah(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Tanda Tangan -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:50px; text-align:center; font-size:13px; margin-top:120px;">
        <div>
          <p>Created By,</p>
          <br><br><br>
          <p>( ${invoiceMeta.createdBy || "........"} )</p>
        </div>
        <div>
          <p>Approved By,</p>
          <br><br><br>
          <p>( ${invoiceMeta.approvedBy || "........"} )</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("invoice-in-content").innerHTML = html;
}

// Tombol untuk buka modal invoice
document.getElementById("show-invoice-btn")?.addEventListener("click", () => {
  generateInvoiceIn();
  document.getElementById("invoice-in-modal").classList.remove("hidden");
});

// Tombol tutup modal
document.getElementById("close-invoice-btn")?.addEventListener("click", () => {
  document.getElementById("invoice-in-modal").classList.add("hidden");
});

// Tombol print
document.getElementById("print-invoice-btn")?.addEventListener("click", () => {
  const invoiceContent =
    document.getElementById("invoice-in-content").innerHTML;
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice Barang Masuk</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: center; }
          th { background: #f0f0f0; }
          .total { text-align: right; font-weight: bold; margin-top: 10px; }
        </style>
      </head>
      <body>
        ${invoiceContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
});

// ===== FORM: ADD ITEM =====
document.getElementById("form-add")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "No Code").toString().trim();
  const name = (fd.get("name") || "No Name").toString().trim();
  const category = (fd.get("category") || "Uncategorized").toString().trim();
  const unit = (fd.get("unit") || "-").toString().trim();
  const supplier = (fd.get("supplier") || "Unknown").toString().trim();
  const branch = (fd.get("branch") || "Gudang Utama").toString();

  const itemRow = document.createElement("div");
  itemRow.className =
    "grid grid-cols-12 border-b border-gray-200 text-sm items-center";
  itemRow.dataset.code = code;
  itemRow.dataset.category = category.toLowerCase();
  itemRow.dataset.unit = unit;

  // status column dikosongin, nanti refreshQtyDisplay yang isi
  itemRow.innerHTML = `
    <div class="p-3">${code}</div>
    <div class="p-3">${name}</div>
    <div class="p-3">${supplier}</div>
    <div class="p-3">0</div>
    <div class="p-3">${unit}</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3"></div> <!-- kosong, diisi updateStatusDisplay -->
  `;

  // tambahkan ke grid
  itemGrid.appendChild(itemRow);

  // inisialisasi stok
  addInitialStock(branch, code, 0);

  // tambahkan kategori button kalau baru
  addCategoryButton(category);

  // refresh tampilan (sekalian update status)
  refreshQtyDisplay();

  // update summary
  updateInventorySummary();

  // reset form dan tutup modal
  e.target.reset();
  closeModal();
});

// ===== FORM: BARANG MASUK =====
document.getElementById("form-in")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const branch = (fd.get("branch") || "Gudang Utama").trim();
  const masuk =
    parseInt((fd.get("masuk") || "0").toString().replace(/\./g, "")) || 0;
  const hargaTotal =
    parseInt((fd.get("harga_total") || "0").toString().replace(/\./g, "")) || 0;
  const name = (fd.get("name") || "").trim();

  // 🔹 Ambil supplier langsung dari data master item
  let supplier = "Unknown";
  const row = document.querySelector(`#item-rows > div[data-code="${code}"]`);
  if (row) {
    supplier = row.children[2].textContent.trim(); // kolom ke-3 tabel = supplier
  }

  // Validasi cabang
  if (branch !== "Gudang Utama") {
    alert(
      "Barang masuk hanya bisa ke Gudang Utama. Gunakan form Barang Keluar untuk transfer!"
    );
    return;
  }

  // Validasi input
  if (!code || masuk <= 0 || hargaTotal <= 0) {
    alert("Mohon isi semua field dengan benar!");
    return;
  }

  // Hitung harga satuan
  const hargaSatuan = hargaTotal / masuk;

  // Update meta stok
  ensureCodeMeta(branch, code);
  const meta = stockMeta[branch][code];
  meta.totalCost += hargaTotal;
  meta.totalQty += masuk;
  meta.hargaBeliTerakhir = hargaSatuan;

  // Update stok di Gudang Utama
  updateStock(branch, code, masuk, "supplier");

  // === Simpan data ke array invoice (multi-item dengan supplier kolom) ===
  saveInvoiceInData({
    code,
    name,
    masuk,
    hargaSatuan,
    hargaTotal,
    supplier, // ✅ tersimpan per item, nanti ditampilkan per baris di invoice
  });
  // simpan data ke array history
  addHistoryRow({
    date: new Date().toLocaleDateString("id-ID"),
    code,
    name,
    branch,
    type: "Masuk",
    qty: masuk,
  });

  // Refresh tampilan
  refreshQtyDisplay();

  // update summary
  updateInventorySummary();

  // Reset form & tutup modal
  e.target.reset();
  closeModal();
});

// ===== FORM: BARANG KELUAR =====
let transferCount = 0; // counter global pindah stok

document.getElementById("form-out")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const branch = (fd.get("branch") || "Gudang Utama").trim(); // cabang asal
  const keluar =
    parseInt((fd.get("keluar") || "0").toString().replace(/\./g, "")) || 0;
  const jenis = (fd.get("jenis_keluar") || "penjualan").trim();
  const tujuan = (fd.get("branch_tujuan") || "").trim(); // cabang tujuan (kalau transfer)

  if (!code || keluar <= 0) {
    alert("Mohon isi semua field dengan benar!");
    return;
  }

  if (jenis === "penjualan") {
    // Barang keluar untuk dijual
    updateStock(branch, code, -keluar);
  } else if (jenis === "transfer") {
    if (!tujuan) {
      alert("Pilih cabang tujuan untuk transfer!");
      return;
    }
    if (tujuan === branch) {
      alert("Cabang tujuan tidak boleh sama dengan cabang asal!");
      return;
    }
    // Transfer antar cabang
    transferStock(branch, tujuan, code, keluar);

    // ✅ Tambah counter pindah stok
    transferCount++;
  }

  // Simpan data ke history
  addHistoryRow({
    date: new Date().toLocaleDateString("id-ID"),
    code,
    name:
      document.querySelector(
        `#item-rows > div[data-code="${code}"] > div:nth-child(2)`
      )?.textContent || "Unknown",
    branch,
    type: jenis === "penjualan" ? "Keluar" : `Transfer → ${tujuan}`,
    qty: keluar,
  });

  // Refresh tampilan stok + summary
  refreshQtyDisplay();
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

// === SALES CHART ===
const ctx = document.getElementById("salesChart");
const salesChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Sales (Rp)",
        data: [1200, 1900, 3000, 2500, 3200, 4000, 3800],
        borderColor: "#1A2A80",
        backgroundColor: "rgba(26,42,128,0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Target (Rp)",
        data: [1500, 2000, 3200, 2700, 3500, 4200, 4000],
        borderColor: "#FF5733",
        backgroundColor: "rgba(255,87,51,0.2)",
        fill: true,
        tension: 0.3,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } },
  },
});

document.getElementById("sales-form")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const date = document.getElementById("sales-date").value;
  const amount = parseInt(document.getElementById("sales-amount").value);
  if (!date || isNaN(amount)) return;
  salesChart.data.labels.push(date);
  salesChart.data.datasets[0].data.push(amount);
  salesChart.update();
  this.reset();
});
