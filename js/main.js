const navbar = document.querySelector(".navbar");
const globalStatsEl = document.querySelector(".global-stats");
const breadcrumbs = document.querySelector(".breadcrumbs");
const loadingOverlay = document.querySelector(".loading-overlay");

let isLoading = false;

let currentPath = [];

let globalStats = null;

globalThis.currentData = null;

document.addEventListener("DOMContentLoaded", async () => {
  Firebase.init();
  Supabase.init();
  await loadGlobalStats();
  await openFolder("projects");
});

function notify(message) {
  console.log(message);
  Toast.show(message);
}

function loading(state = true) {
  isLoading = state;
}

function loadingWithOverlay(state = true) {
  isLoading = state;
  LoadingOverlay.toggle(state);
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

async function loginWithGoogle() {
  await withLoading(async () => {
    await Firebase.loginWithGoogle();
  });
}

function generateUserName() {
  return getRandomItem(USERNAMES);
}

async function loadGlobalStats() {
  const userStats = await Firebase.Metadata.getUserStats();
  const totalUsers = userStats.count;
  const totalProjects = await Firebase.getTotalDocuments("projects");

  globalStats = { totalUsers, totalProjects };
  renderGlobalStatsEl();
}

function updateUI() {
  navbar.querySelector(".user-control").innerHTML = currentAuthUser ? Avatar.createHTML() : `<button class="oauth-btn button" onclick="loginWithGoogle()"><img src="assets/images/google.png" />Continue with Google</button>`;

  renderBreadcrumbs();
  DataManager.render();
}

function getPathString() {
  return currentPath.map((item) => item.name).join("/");
}

function isCollection() {
  const path = getPathString();
  const segments = path.split("/").filter(Boolean);
  return segments.length % 2 !== 0;
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

  loadData();
  SearchBar.toggle(false);
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
  const confirmed = await ConfirmModal.open(`Delete item?`, "This action cannot be undone.");
  if (!confirmed) return;

  await withLoading(async () => {
    const item = currentData.find((item) => item.id === itemId);
    const path = isCollection() ? `${getPathString()}/${item.id}` : getPathString();
    await Firebase.deleteItem(path);

    await loadData();
  });
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
    const pathString = getPathString();
    if (isCollection()) {
      currentData = await Firebase.getDocuments(pathString);
    } else {
      const collections = await Firebase.listCollections(pathString);
      if (collections.length > 0) {
        currentData = collections;
      } else {
        currentData = await Firebase.getDocument(pathString);
      }
    }

    updateUI();
  });
}

async function debug() {
  const userStats = await Firebase.Metadata.getUserStats();
  console.log(userStats);
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
