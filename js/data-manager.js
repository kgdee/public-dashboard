const DataManager = (() => {
  const element = document.querySelector(".data-manager");

  let currentData = null;

  function render(data) {
    currentData = data || structuredClone(globalThis.currentData);

    if (!currentData || currentData.length <= 0) {
      element.innerHTML = "No data";
    } else if (Array.isArray(currentData)) {
      ItemsManager.render();
    } else {
      DocumentManager.render();
    }
  }

  function isModified() {
    return JSON.stringify(currentData) !== JSON.stringify(globalThis.currentData);
  }

  const ItemsManager = (() => {
    function render() {
      element.innerHTML = `
        <div class="data-manager">
          <div class="header">
            <div class="title">Items</div>
            <div class="actions">
              <button class="button" onclick="DataManager.ItemsManager.addItem()">Add item</button>
              <button class="button" onclick="loadData()"><i class="bi bi-arrow-clockwise"></i></button>
              <button class="button" onclick="SearchBar.toggle()"><i class="bi bi-search"></i></button>
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

    async function addItem() {
      await withLoading(async () => {
        const documentPath = `${getPathString()}/${isCollection() ? `newDocument` : `newCollection/newDocument`}`;
        await Firebase.createDocument(documentPath);
        await loadData();
      });
    }

    return { render, addItem };
  })();

  const DocumentManager = (() => {
    function render() {
      element.innerHTML = `
        <div class="header">
          <div class="title">Document ${currentData.id}</div>
          <div class="actions">
            <button class="button save-btn hidden" onclick="DataManager.DocumentManager.save()">Save changes</button>
            <button class="button" onclick="DataManager.DocumentManager.addProperty()">Add property</button>
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
              .map(([key, value], i) => {
                const isFile = value instanceof File;
                const formattedValue = !isFile ? escapeHTML(JSON.stringify(value)) : `[File] ${value.name}`;
                return `
                  <tr${key === "id" ? ` style="pointer-events: none;"` : ""}>
                    <td><input type="text" value="${key}" onchange="DataManager.DocumentManager.replaceKey(${i}, this.value)"></td>
                    <td><input type="text" value="${formattedValue}" onchange="DataManager.DocumentManager.replaceValue(${i}, this.value)" style="${isFile ? `color: var(--color-info);` : ""}"></td>
                    <td>
                      <div class="actions${key === "id" ? " hidden" : ""}">
                        <button class="file-btn" onclick="ValueModal.open(${i})"><i class="bi bi-plus-lg"></i></button>
                        <button class="delete-btn" onclick="DataManager.DocumentManager.deleteProperty('${key}')"><i class="bi bi-x-lg"></i></button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `;

      element.querySelectorAll("td input").forEach((el) => el.addEventListener("change", updateUI));
      updateUI();
    }

    function addProperty() {
      currentData[`key_${generateId().slice(0, 4)}`] = null;
      render(currentData);
    }

    function deleteProperty(key) {
      delete currentData[key];
      render(currentData);
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
      const saveBtn = element.querySelector(".save-btn");
      saveBtn.classList.toggle("hidden", !isModified());
    }

    return { render, addProperty, deleteProperty, save, replaceKey, replaceValue, updateUI };
  })();

  return {
    get currentData() {
      return currentData;
    },
    set currentData(value) {
      currentData = value;
    },
    render,
    ItemsManager,
    DocumentManager,
  };
})();
