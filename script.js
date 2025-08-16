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
// === ITEM SECTION ===
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
let stockMeta = { "Gudang Utama": {} }; // {masukSupplier, masukTransfer, keluar}

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

function refreshQtyDisplay() {
  const checkedBranches = Array.from(
    document.querySelectorAll(".branch-checkbox:checked")
  ).map((cb) => cb.dataset.branch);

  const multiple = checkedBranches.length > 1;

  document.querySelectorAll("#item-rows > div").forEach((row) => {
    const code = row.children[0].textContent.trim();
    let totalQty = 0,
      totalMasuk = 0,
      totalKeluar = 0;

    checkedBranches.forEach((branch) => {
      if (stockData[branch] && typeof stockData[branch][code] !== "undefined") {
        totalQty += stockData[branch][code] || 0;
      }
      if (stockMeta[branch] && stockMeta[branch][code]) {
        if (multiple) {
          // mode semua → hanya hitung masuk dari supplier
          totalMasuk += stockMeta[branch][code].masukSupplier || 0;
        } else {
          // mode 1 cabang → hitung semua masuk
          totalMasuk +=
            (stockMeta[branch][code].masukSupplier || 0) +
            (stockMeta[branch][code].masukTransfer || 0);
        }
        totalKeluar += stockMeta[branch][code].keluar || 0;
      }
    });

    if (row.children[3]) row.children[3].textContent = totalQty;
    if (row.children[4]) row.children[4].textContent = totalMasuk;
    if (row.children[5]) row.children[5].textContent = totalKeluar;
  });
}

// CABANG UI
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
  ensureBranchInStockData(branchName);
  updateBranchSelectOptions(branchName);
  branchModal.classList.add("hidden");
  branchForm.reset();
  refreshQtyDisplay();
});
document
  .querySelectorAll(".branch-checkbox")
  .forEach((cb) => cb.addEventListener("change", refreshQtyDisplay));

// TABS
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

// CATEGORY
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

// MODAL
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

// FORM: TAMBAH ITEM
document.getElementById("form-add")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "No Code").toString().trim();
  const name = (fd.get("name") || "No Name").toString().trim();
  const supplier = (fd.get("supplier") || "Unknown").toString().trim();
  const qty = parseInt(fd.get("qty")) || 0;
  const branch = (fd.get("branch") || "Gudang Utama").toString();
  const category = (fd.get("category") || "Uncategorized").toString().trim();
  const status = qty < 10 ? "Low" : "Normal";
  const statusClass =
    qty < 10
      ? "bg-red-100 text-red-700 px-2 py-1 rounded"
      : "bg-green-100 text-green-700 px-2 py-1 rounded";
  const itemRow = document.createElement("div");
  itemRow.className =
    "grid grid-cols-7 border-b border-gray-200 text-sm items-center";
  itemRow.dataset.code = code;
  itemRow.dataset.category = category.toLowerCase();
  itemRow.innerHTML = `
    <div class="p-3">${code}</div>
    <div class="p-3">${name}</div>
    <div class="p-3">${supplier}</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3">0</div>
    <div class="p-3"><span class="${statusClass}">${status}</span></div>
  `;
  itemGrid.appendChild(itemRow);
  addInitialStock(branch, code, qty);
  addCategoryButton(category);
  refreshQtyDisplay();
  e.target.reset();
  closeModal();
});

// FORM: BARANG MASUK
document.getElementById("form-in")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const masuk = parseInt(fd.get("masuk")) || 0;
  const branch = (fd.get("branch") || "Gudang Utama").trim();
  if (!code) {
    e.target.reset();
    closeModal();
    return;
  }
  if (branch === "Gudang Utama") {
    updateStock(branch, code, masuk, "supplier");
  } else {
    transferStock("Gudang Utama", branch, code, masuk);
  }
  refreshQtyDisplay();
  e.target.reset();
  closeModal();
});

// FORM: BARANG KELUAR
document.getElementById("form-out")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const code = (fd.get("code") || "").trim();
  const keluar = parseInt(fd.get("keluar")) || 0;
  const branch = (fd.get("branch") || "Gudang Utama").trim();
  if (!code) {
    e.target.reset();
    closeModal();
    return;
  }
  updateStock(branch, code, -keluar);
  refreshQtyDisplay();
  e.target.reset();
  closeModal();
});

// AUTO-FILL
function setupAutoFill(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const nameInput = form.querySelector('input[name="name"]');
  const codeInput = form.querySelector('input[name="code"]');
  if (!nameInput || !codeInput) return;
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
