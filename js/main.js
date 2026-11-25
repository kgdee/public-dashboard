const navbar = document.querySelector(".navbar");
const globalStatsEl = document.querySelector(".global-stats");
const breadcrumbs = document.querySelector(".breadcrumbs");
const menuModal = document.querySelector(".app > .menu-modal");
const codeModal = document.querySelector(".code-modal");
const loadingOverlay = document.querySelector(".loading-overlay");

const urlParams = new URLSearchParams(window.location.search);

let isLoading = false;

let currentPath = [];
let pathString = null;
let isCollection = false;
let globalStats = null;

globalThis.currentAuthUser = null;
globalThis.currentData = null;

let currentSettings = load("currentSettings", {
  notifications: true,
  darkTheme: false,
});

document.addEventListener("DOMContentLoaded", async () => {
  loadingWithOverlay(true);
  await Firebase.init(onAuthStateChanged);
  Supabase.init();
  await loadGlobalStats();
  await openFolder("projects");
});

function onAuthStateChanged(user) {
  globalThis.currentAuthUser = user;
  console.log("currentAuthUser", currentAuthUser);

  updateUI();
  loadingWithOverlay(false);
}

function notify(message) {
  console.log(message);
  Toast.show(message);
}

function loading(state = true) {
  isLoading = state;
}

function loadingWithOverlay(state = true) {
  isLoading = state;
  loadingOverlay.classList.toggle("hidden", !isLoading);
}

async function withLoading(action, { shouldShow = true, isDisabled = false } = {}) {
  if (!isDisabled) {
    if (isLoading) return;
  }

  try {
    if (!isDisabled) {
      loading(true);
      if (shouldShow) loadingOverlay.classList.toggle("hidden", false);
    }

    return await action();
  } finally {
    if (!isDisabled) {
      loading(false);
      if (shouldShow) loadingOverlay.classList.toggle("hidden", true);
    }
  }
}

function login() {
  window.location.href = `http://kgdee-auth-hub.netlify.app/pages/login/login.html?redirect=${encodeURIComponent(window.location.href)}`;
}

async function logout() {
  await withLoading(async () => {
    await Firebase.logout();
    window.location.href = "/";
  });
}

function getUserName(data) {
  data = data || currentAuthUser;
  return data.name || data.displayName || data.email || data.authorName || "Anonymous User";
}

function generateUserName() {
  return getRandomItem(USERNAMES);
}

async function loadGlobalStats() {
  const totalUsers = await Firebase.getTotalAuthUsers();
  const totalProjects = await Firebase.getTotalDocuments("projects");

  globalStats = { totalUsers, totalProjects };
  renderGlobalStatsEl();
}

function updateUI() {
  document.body.classList.toggle("dark-theme", currentSettings.darkTheme);

  navbar.querySelector(".user-control").innerHTML = currentAuthUser ? `<div class="avatar self-avatar" onclick="toggleMenuModal()"></div>` : `<button class="button" onclick="login()">Login</button>`;

  if (currentAuthUser) {
    const avatarEls = document.querySelectorAll(".self-avatar");
    avatarEls?.forEach((el) => (el.innerHTML = Avatar.createHTML(currentAuthUser, false)));

    const usernameEls = document.querySelectorAll(".self-username");
    usernameEls?.forEach((el) => (el.textContent = getUserName()));
  }

  const settingEls = document.querySelectorAll(`[data-setting-id]`);
  settingEls.forEach((el) => {
    const setting = currentSettings[el.dataset.settingId];

    const checkbox = el.querySelector("input");
    if (checkbox) checkbox.checked = setting;

    const descEl = el.querySelector(".desc");
    if (descEl) descEl.textContent = setting ? "Enabled" : "Disabled";
  });

  renderBreadcrumbs();
}

function openFolder(folderId) {
  const isListed = currentPath.some((item) => item.id === folderId);
  if (isListed) {
    const index = currentPath.findIndex((item) => item.id === folderId);
    currentPath = currentPath.slice(0, index + 1);
  } else {
    const folder = {
      id: generateId(),
      name: folderId,
    };
    currentPath.push(folder);
  }

  pathString = currentPath.map((item) => item.name).join("/");
  const segments = pathString.split("/").filter(Boolean);
  isCollection = segments.length % 2 !== 0;

  loadData();
  SearchBar.forceClose();
}

function openPrevFolder() {
  const folderId = currentPath.at(-2).id;
  openFolder(folderId);
}

function reloadFolder() {
  const folderId = currentPath.at(-1).id;
  openFolder(folderId);
}

async function deleteItem(itemId) {
  const confirmed = await ConfirmModal.open(`Delete item "${itemId}"?`, "This action cannot be undone.");
  if (!confirmed) return;

  await withLoading(async () => {
    const item = currentData.find((item) => item.id === itemId);
    const path = isCollection ? `${pathString}/${item.id}` : pathString;
    await Firebase.deleteItem(path);
  });

  loadData();
}

function renderGlobalStatsEl() {
  globalStatsEl.innerHTML = `
    <div class="item">
      <i class="bi bi-people"></i>
      <div class="info">
        <div class="value">${globalStats.totalUsers}</div>
        <div class="label">Total users</div>
      </div>
    </div>
    <div class="item">
      <i class="bi bi-code-square"></i>
      <div class="info">
        <div class="value">${globalStats.totalProjects}</div>
        <div class="label">Total projects</div>
      </div>
    </div>
  `;
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = currentPath.map((item) => `<div class="item" onclick="openFolder('${item.id}')">${item.name}</div>`).join("");
}

async function loadData() {
  await withLoading(async () => {
    if (isCollection) {
      currentData = await Firebase.getDocuments(pathString);
    } else {
      const collections = await Firebase.listCollections(pathString);
      if (collections.length > 0) {
        currentData = collections;
      } else {
        currentData = await Firebase.getDocument(pathString);
      }
    }

    DataManager.render();
    updateUI();
  });
}

function toggleMenuModal() {
  menuModal.classList.toggle("hidden");
}

function toggleSetting(name, force) {
  currentSettings[name] = force !== undefined ? force : !currentSettings[name];
  save("currentSettings", currentSettings);
  updateUI();
}

async function formatCode() {
  const code = codeModal.querySelector(".modal-body textarea").value;
  await copyText(JSON.stringify(code));
  notify("Formatted code copied to clipboard!");
}

function toggleCodeModal() {
  codeModal.classList.toggle("hidden");
}

async function debug() {

}

const keyActions = {
  Space: debug,
  KeyF: toggleFullscreen,
};

document.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  const isFocus = document.activeElement.matches("input, textarea");

  if (action && !isFocus) {
    event.preventDefault();
    action();
  }
});
