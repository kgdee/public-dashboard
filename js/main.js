const navbar = document.querySelector(".navbar");
const breadcrumbs = document.querySelector(".breadcrumb");
const dataTable = document.querySelector(".data-table");
const loadingOverlay = document.querySelector(".loading-overlay");

let isLoading = false;

let currentPath = [];

let currentData = null;

document.addEventListener("DOMContentLoaded", async () => {
  Firebase.init();
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

function updateUI() {
  navbar.querySelector(".user-control").innerHTML = currentAuthUser ? Avatar.createHTML() : `<button class="oauth-btn button" onclick="loginWithGoogle()"><img src="/assets/images/google.png" />Continue with Google</button>`;

  renderBreadcrumbs();
  renderDataTable();
}

async function loginWithGoogle() {
  await withLoading(async () => {
    await Firebase.loginWithGoogle();
  });
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
}

async function deleteItem(itemId) {
  const confirmed = await ConfirmModal.open(`Delete item?`, "This action cannot be undone.");
  if (!confirmed) return;

  await withLoading(async () => {
    const item = currentData.find((item) => item.id === itemId);
    await Firebase.deleteItem(item.path);

    await loadData();
  });
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = currentPath.map((item) => `<div class="item" onclick="openFolder('${item.id}')">${item.name}</div>`).join("");
}

async function loadData() {
  const isCollection = currentPath.length % 2 !== 0;

  const pathString = currentPath.map((item) => item.name).join("/");
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

  updateUI();
}

async function renderDataTable() {
  if (!currentData || currentData.length <= 0) {
    dataTable.innerHTML = `
      <caption>
        No data
      </caption>
    `;
  } else if (Array.isArray(currentData)) {
    dataTable.innerHTML = `
      <caption>
        Items
      </caption>
      <thead>
        <tr>
          <th>ID</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${currentData
          .map(
            (item) => `
          <tr>
            <td class="id-col" onclick="openFolder('${item.id}')">${item.id}</td>
            <td>
              <div class="actions">
                <button class="open-btn" onclick="openFolder('${item.id}')"><i class="bi bi-folder2-open"></i></button>
                <button class="delete-btn" onclick="deleteItem('${item.id}')"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    `;
  } else {
    dataTable.innerHTML = `
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(currentData)
          .map(([key, value]) => `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`)
          .join("")}
      </tbody>
    `;
  }
}

function debug() {
  openFolder(`social-media`);
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
