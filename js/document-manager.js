const DocumentManager = (() => {
  const element = document.querySelector(".document-manager");
  const titleEl = element.querySelector(".header .title");
  const tbody = element.querySelector("tbody");
  const menuModal = element.querySelector(".menu-modal");

  let currentData = null;

  menuModal.querySelectorAll(":scope > *").forEach((el) => el.addEventListener("click", toggleMenuModal));

  function isDataModified() {
    return JSON.stringify(currentData) !== JSON.stringify(globalThis.currentData);
  }

  function render(data) {
    currentData = data || structuredClone(globalThis.currentData);

    tbody.innerHTML = Object.entries(currentData)
      .map(([key, value], i) => {
        const isFile = value instanceof File;
        const formattedValue = !isFile ? escapeHTML(JSON.stringify(value)) : `[File] ${value.name}`;
        return `
          <tr>
            <td><input type="text" value="${key}" onchange="DocumentManager.replaceKey(${i}, this.value)"></td>
            <td><input type="text" value="${formattedValue}" onchange="DocumentManager.replaceValue(${i}, this.value)" style="${isFile ? `color: var(--color-info);` : ""}"></td>
            <td>
              <div class="actions">
                <button class="file-btn" onclick="ValueModal.open(${i})"><i class="bi bi-plus-lg"></i></button>
                <button class="delete-btn" onclick="DocumentManager.deleteProperty('${key}')"><i class="bi bi-x-lg"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    titleEl.innerHTML = `Document ${currentData.id}`;
    tbody.querySelectorAll("td input").forEach((el) => el.addEventListener("change", updateUI));
    updateUI();
  }

  function addProperty() {
    const names = Object.keys(currentData);
    let keyName = getItemName(names, "new_key");
    currentData[keyName] = null;
    render(currentData);
  }

  function deleteProperty(key) {
    delete currentData[key];
    render(currentData);
  }

  async function save() {
    await withLoading(async () => {
      await Firebase.setDocument(pathString, currentData);
    });

    currentPath.pop();
    openFolder(currentData.id);
  }

  function replaceKey(index, newKey) {
    currentData = ObjectUtils.replaceKey(currentData, index, newKey);
    render(currentData);
  }

  function replaceValue(index, newValue) {
    if (isString(newValue) && !isValidJSON(newValue)) {
      Toast.show("Warning: Invalid value provided. Value rejected.");
    } else {
      newValue = isString(newValue) ? JSON.parse(newValue) : newValue;
      currentData = ObjectUtils.replaceValue(currentData, index, newValue);
      render(currentData);
    }
  }

  function updateUI() {
    const saveBtn = menuModal.querySelector(`[data-item-id="save"]`);
    saveBtn.classList.toggle("hidden", !isDataModified());
  }

  function open() {
    render();
    element.classList.toggle("hidden", false);
  }

  function close() {
    element.classList.toggle("hidden", true);
  }

  function toggleMenuModal() {
    menuModal.classList.toggle("hidden");
  }

  return { open, close, addProperty, deleteProperty, save, replaceKey, replaceValue, toggleMenuModal };
})();
