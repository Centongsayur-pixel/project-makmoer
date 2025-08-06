// Handle Bottom Navigation Clicks
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();

    // Reset semua nav-item
    navItems.forEach((i) => {
      i.classList.remove("primary");
      i.classList.add("text-gray-500");
      const indicator = i.querySelector(".indicator");
      if (indicator) indicator.remove();
    });

    // Set nav-item aktif
    item.classList.remove("text-gray-500");
    item.classList.add("primary");
    const dot = document.createElement("span");
    dot.className =
      "indicator absolute -bottom-1 w-1 h-1 rounded-full bg-[#1A2A80]";
    item.appendChild(dot);

    // Sembunyikan semua section dan tampilkan target
    sections.forEach((section) => {
      section.classList.add("hidden-section");
      section.classList.remove("active-section");
    });
    const target = item.getAttribute("data-tab");
    const activeSection = document.getElementById(target);
    activeSection.classList.remove("hidden-section");
    setTimeout(() => {
      activeSection.classList.add("active-section");
    }, 10);
  });
});

// Sales Chart (Multi-Line)
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

// Add Sales Data (Form)
document.getElementById("sales-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const date = document.getElementById("sales-date").value;
  const amount = parseInt(document.getElementById("sales-amount").value);

  if (!date || isNaN(amount)) return;

  // Update chart dengan data baru
  salesChart.data.labels.push(date);
  salesChart.data.datasets[0].data.push(amount);
  salesChart.update();

  this.reset();
});

changePhotoBtn.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      profilePhoto.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});
