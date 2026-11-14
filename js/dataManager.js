const DataManager = (() => {
  const element = document.querySelector(".data-manager");

  let currentData = null;

  function render(reset = true) {
    if (reset) currentData = structuredClone(globalThis.currentData);

    if (!currentData || currentData.length <= 0) {
      element.innerHTML = "No data";
    } else if (Array.isArray(currentData)) {
      ItemsManager.render();
    } else {
      DocumentManager.render();
    }
  }

  const ItemsManager = (() => {
    function render() {
      element.innerHTML = `
        <div class="data-manager">
          <div class="header">
            <div class="title">Items</div>
            <div class="actions">
              <button class="button">Add item</button>
            </div>
          </div>
          <table class="data-table">
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
          </table>
        </div>
      `;
    }

    return { render };
  })();

  const DocumentManager = (() => {
    function render() {
      element.innerHTML = `
        <div class="data-manager">
          <div class="header">
            <div class="title">Item ${currentData.id}</div>
            <div class="actions">
              <button class="button save-btn hidden" onclick="DataManager.DocumentManager.save()">Save changes</button>
              <button class="button" onclick="DataManager.DocumentManager.addProperty()">Add property</button>
              <button class="button btn-danger" onclick="DataManager.DocumentManager.deleteDocument()">Delete document</button>
            </div>
          </div>
          <table class="data-table">
            <colgroup>
              <col style="width: 20%;">
              <col style="width: 60%;">
              <col style="width: auto;">
            </colgroup>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(currentData)
                .map(
                  ([key, value], i) => `
                  <tr${key === "id" ? ` style="pointer-events: none;"` : ""}>
                    <td><input type="text" value="${key}" onchange="DataManager.DocumentManager.replaceKey(${i}, this.value)"></td>
                    <td><input type="text" value="${escapeHTML(JSON.stringify(value))}" onchange="DataManager.DocumentManager.replaceValue(${i}, this.value)"></td>
                    <td>
                      <div class="actions${key === "id" ? " hidden" : ""}">
                        <button class="file-btn" onclick=""><i class="bi bi-file-earmark-plus"></i></button>
                        <button class="delete-btn" onclick="DataManager.DocumentManager.deleteProperty('${key}')"><i class="bi bi-x-lg"></i></button>
                      </div>
                    </td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      element.querySelectorAll("td input").forEach((el) => el.addEventListener("change", updateUI));
    }

    function addProperty() {
      currentData[`key_${generateId().slice(0, 4)}`] = null;
      render(false);
    }

    function deleteProperty(key) {
      delete currentData[key];
      render(false);
    }

    async function deleteDocument() {
      const confirmed = await ConfirmModal.open(`Delete document?`, "This action cannot be undone.");
      if (!confirmed) return;

      await withLoading(async () => {
        const pathString = getPathString();
        await Firebase.deleteDocument(pathString);
        openPrevFolder();
      });
    }

    async function save() {
      await withLoading(async () => {
        const { path, ...documentData } = currentData;
        await Firebase.setDocument(path, documentData);
      });

      reloadFolder();
    }

    function replaceKey(index, newKey) {
      currentData = ObjectUtils.replaceKey(currentData, index, newKey);
      render(false);
    }

    function replaceValue(index, newValue) {
      currentData = ObjectUtils.replaceValue(currentData, index, JSON.parse(newValue));
      render(false);
    }

    function updateUI() {
      const isModified = JSON.stringify(currentData) !== JSON.stringify(globalThis.currentData);

      const saveBtn = element.querySelector(".save-btn");
      saveBtn.classList.toggle("hidden", !isModified);
    }

    return { render, addProperty, deleteProperty, deleteDocument, save, replaceKey, replaceValue, updateUI };
  })();

  return { render, DocumentManager };
})();
