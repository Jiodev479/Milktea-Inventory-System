// ─── SESSION GUARD ────────────────────────────────────────
if (localStorage.getItem("isLoggedIn") !== "true") {
  window.location.href = "index.html";
}

// ─── STATE ────────────────────────────────────────────────
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];
let activity = JSON.parse(localStorage.getItem("activity")) || [];
let editIndex = -1;
let barChart, donutChart;
let currentFilter = "all";
let currentSort = { key: null, asc: true };

// ─── PERSIST ──────────────────────────────────────────────
function saveData() {
  localStorage.setItem("inventory", JSON.stringify(inventory));
}
function saveActivity() {
  localStorage.setItem("activity", JSON.stringify(activity.slice(0, 30)));
}

// ─── GREETING & DATE ──────────────────────────────────────
function initGreeting() {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("greeting").textContent = greet;

  const stored = JSON.parse(localStorage.getItem("user"));
  if (stored)
    document.getElementById("topbarUser").textContent = stored.username;

  document.getElementById("topbarDate").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
}

// ─── STATUS — single source of truth ──────────────────────
// key is always lowercase so filter comparisons always match exactly
function getStatus(qty) {
  qty = Number(qty);
  if (qty === 0) return { key: "out", label: "Out", cls: "pill-out" };
  if (qty <= 10) return { key: "low", label: "Low", cls: "pill-low" };
  return { key: "good", label: "Good", cls: "pill-ok" };
}

// ─── STATS ────────────────────────────────────────────────
function updateStats() {
  document.getElementById("totalItems").textContent = inventory.length;

  const total = inventory.reduce((s, i) => s + Number(i.qty), 0);
  document.getElementById("totalStock").textContent = total;

  // Low stock count = items that are low OR out
  const alertCount = inventory.filter(
    (i) => getStatus(i.qty).key !== "good",
  ).length;
  document.getElementById("lowStock").textContent = alertCount;

  const top = [...inventory].sort((a, b) => Number(b.qty) - Number(a.qty))[0];
  document.getElementById("topItem").textContent = top ? top.name : "—";
}

// ─── ALERT BANNER ─────────────────────────────────────────
function checkAlerts() {
  const outItems = inventory.filter((i) => Number(i.qty) === 0);
  const lowItems = inventory.filter(
    (i) => Number(i.qty) > 0 && Number(i.qty) <= 10,
  );
  const banner = document.getElementById("alertBanner");
  const text = document.getElementById("alertText");

  if (outItems.length || lowItems.length) {
    const parts = [];
    if (outItems.length) parts.push(`${outItems.length} item(s) out of stock`);
    if (lowItems.length) parts.push(`${lowItems.length} item(s) running low`);
    text.textContent = parts.join(" · ") + " — please restock soon.";
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}

function closeBanner() {
  document.getElementById("alertBanner").style.display = "none";
}

// ─── CHARTS ───────────────────────────────────────────────
const PALETTE = [
  "#c9933a",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#f97316",
];

function renderCharts() {
  const names = inventory.map((i) => i.name);
  const qtys = inventory.map((i) => Number(i.qty));
  const hasData = inventory.length > 0;

  // DONUT
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(
    document.getElementById("donutChart").getContext("2d"),
    {
      type: "doughnut",
      data: {
        labels: hasData ? names : ["No Data"],
        datasets: [
          {
            data: hasData ? qtys : [1],
            backgroundColor: hasData ? PALETTE : ["#2a2a2a"],
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#999",
              font: { size: 11, family: "DM Sans" },
              boxWidth: 10,
              padding: 12,
            },
          },
        },
      },
    },
  );

  // BAR
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: hasData ? names : ["No Data"],
      datasets: [
        {
          label: "Quantity",
          data: hasData ? qtys : [0],
          backgroundColor: hasData ? PALETTE : ["#2a2a2a"],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#888", font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: { color: "#888", font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── ACTIVITY LOG ─────────────────────────────────────────
function logActivity(type, message) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  activity.unshift({ type, message, time });
  saveActivity();
  renderActivity();
}

function renderActivity() {
  const list = document.getElementById("activityList");
  if (!activity.length) {
    list.innerHTML =
      '<div class="activity-empty">No recent activity yet.</div>';
    return;
  }
  list.innerHTML = activity
    .slice(0, 10)
    .map(
      (a) => `
    <div class="activity-item">
      <div class="activity-dot dot-${a.type}"></div>
      <div class="activity-msg">${a.message}</div>
      <div class="activity-time">${a.time}</div>
    </div>`,
    )
    .join("");
}

function clearActivity() {
  if (!activity.length) return;
  if (!confirm("Clear all activity history?")) return;
  activity = [];
  saveActivity();
  renderActivity();
}

// ─── FILTER / SORT / SEARCH ───────────────────────────────
function getFilteredInventory() {
  let list = [...inventory];

  // Search by name or category
  const q = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();
  if (q) {
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q),
    );
  }

  // Status filter — compares against status KEY: "good" | "low" | "out"
  if (currentFilter !== "all") {
    list = list.filter((i) => getStatus(i.qty).key === currentFilter);
  }

  // Sort
  if (currentSort.key) {
    list.sort((a, b) => {
      let va = a[currentSort.key] ?? "";
      let vb = b[currentSort.key] ?? "";
      if (currentSort.key === "qty") {
        va = Number(va);
        vb = Number(vb);
      } else {
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
      }
      if (va < vb) return currentSort.asc ? -1 : 1;
      if (va > vb) return currentSort.asc ? 1 : -1;
      return 0;
    });
  }

  return list;
}

// ─── RENDER TABLE ─────────────────────────────────────────
function displayItems() {
  const tbody = document.getElementById("inventoryList");
  const empty = document.getElementById("emptyState");
  const emptyMsg = document.getElementById("emptyMsg");
  const filtered = getFilteredInventory();

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    const q = (document.getElementById("searchInput")?.value || "").trim();
    if (q) {
      emptyMsg.textContent = `No items match "${q}"`;
    } else if (currentFilter !== "all") {
      const labels = {
        good: "Good Stock",
        low: "Low Stock",
        out: "Out of Stock",
      };
      emptyMsg.textContent = `No items with "${labels[currentFilter]}" status`;
    } else {
      emptyMsg.textContent = "Add your first inventory item above";
    }
  } else {
    empty.style.display = "none";
    tbody.innerHTML = filtered
      .map((item) => {
        const realIdx = inventory.indexOf(item);
        const s = getStatus(item.qty);
        return `
        <tr>
          <td class="td-name">${escapeHtml(item.name)}</td>
          <td><span class="category-tag">${item.category ? escapeHtml(item.category) : "—"}</span></td>
          <td><strong>${item.qty}</strong></td>
          <td><span class="pill ${s.cls}">${s.label}</span></td>
          <td>
            <button class="btn-edit"   onclick="editItem(${realIdx})">Edit</button>
            <button class="btn-delete" onclick="deleteItem(${realIdx})">Delete</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  updateStats();
  renderCharts();
  checkAlerts();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── FILTER TABS ──────────────────────────────────────────
function setFilter(val, btn) {
  currentFilter = val;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  displayItems();
}

function filterItems() {
  displayItems();
}

// ─── SORT ─────────────────────────────────────────────────
function sortBy(key) {
  if (currentSort.key === key) currentSort.asc = !currentSort.asc;
  else {
    currentSort.key = key;
    currentSort.asc = true;
  }
  document
    .querySelectorAll(".sort-arrow")
    .forEach((el) => (el.textContent = "↕"));
  const arrow = document.getElementById("sort-" + key);
  if (arrow) arrow.textContent = currentSort.asc ? "↑" : "↓";
  displayItems();
}

// ─── ADD / UPDATE ──────────────────────────────────────────
function addItem() {
  const nameEl = document.getElementById("itemName");
  const qtyEl = document.getElementById("itemQty");
  const catEl = document.getElementById("itemCategory");

  const name = nameEl.value.trim();
  const rawQty = qtyEl.value.trim();
  const qty = Number(rawQty);
  const category = catEl.value.trim();

  if (!name) {
    showFormError("Please enter an item name.");
    nameEl.focus();
    return;
  }
  if (rawQty === "") {
    showFormError("Please enter a quantity.");
    qtyEl.focus();
    return;
  }
  if (isNaN(qty) || qty < 0) {
    showFormError("Quantity must be 0 or a positive number.");
    qtyEl.focus();
    return;
  }

  clearFormError();

  if (editIndex === -1) {
    const dup = inventory.some(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) {
      showFormError(`"${name}" already exists.`);
      return;
    }
    inventory.push({ name, qty, category });
    logActivity(
      "add",
      `Added <strong>${name}</strong> — Qty: ${qty}${category ? ", " + category : ""}`,
    );
  } else {
    const old = inventory[editIndex];
    const dup = inventory.some(
      (i, idx) =>
        i.name.toLowerCase() === name.toLowerCase() && idx !== editIndex,
    );
    if (dup) {
      showFormError(`"${name}" already exists.`);
      return;
    }
    logActivity(
      "edit",
      `Updated <strong>${old.name}</strong> → ${name} (Qty: ${old.qty}→${qty})`,
    );
    inventory[editIndex] = { name, qty, category };
    cancelEdit();
  }

  saveData();
  displayItems();
  clearForm();
}

function showFormError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.style.display = "block";
}
function clearFormError() {
  const el = document.getElementById("formError");
  if (el) {
    el.textContent = "";
    el.style.display = "none";
  }
}
function clearForm() {
  document.getElementById("itemName").value = "";
  document.getElementById("itemQty").value = "";
  document.getElementById("itemCategory").value = "";
  clearFormError();
}

// ─── EDIT ──────────────────────────────────────────────────
function editItem(index) {
  const item = inventory[index];
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemQty").value = item.qty;
  document.getElementById("itemCategory").value = item.category || "";
  editIndex = index;
  document.getElementById("mainBtn").textContent = "✓ Update Item";
  document.getElementById("cancelBtn").style.display = "inline-flex";
  document.getElementById("formSectionLabel").textContent = "Edit Item";
  clearFormError();
  document
    .querySelector(".form-section")
    .scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEdit() {
  editIndex = -1;
  clearForm();
  document.getElementById("mainBtn").textContent = "+ Add Item";
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("formSectionLabel").textContent = "Add New Item";
}

// ─── DELETE ────────────────────────────────────────────────
function deleteItem(index) {
  const item = inventory[index];
  if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
  logActivity(
    "delete",
    `Deleted <strong>${item.name}</strong> (was Qty: ${item.qty})`,
  );
  inventory.splice(index, 1);
  if (editIndex === index) cancelEdit();
  else if (editIndex > index) editIndex--;
  saveData();
  displayItems();
}

// ─── LOGOUT ────────────────────────────────────────────────
function logout() {
  if (confirm("Log out of ERYX?")) {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "signin.html";
  }
}

// ─── SIDEBAR MOBILE TOGGLE ────────────────────────────────
function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
}
document.addEventListener("click", function (e) {
  const sidebar = document.querySelector(".sidebar");
  const ham = document.getElementById("hamburger");
  if (window.innerWidth <= 768 && sidebar.classList.contains("open")) {
    if (!sidebar.contains(e.target) && e.target !== ham) {
      sidebar.classList.remove("open");
    }
  }
});

// ─── ENTER KEY SUBMITS FORM ───────────────────────────────
["itemName", "itemQty", "itemCategory"].forEach((id) => {
  document.getElementById(id)?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  });
});

// ─── SCROLL TO SECTION ─────────────────────────────────────
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// ─── INIT ──────────────────────────────────────────────────
initGreeting();
renderActivity();
displayItems();
