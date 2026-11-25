const ItemsManager = (() => {
  const element = document.querySelector(".items-manager");
  const titleEl = element.querySelector(".header .title");
  const tbody = element.querySelector("tbody");
  const menuModal = element.querySelector(".menu-modal");

  let currentData = null;

  menuModal.querySelectorAll(":scope > *").forEach((el) => el.addEventListener("click", toggleMenuModal));

  function render(data) {
    currentData = data || structuredClone(globalThis.currentData);

    tbody.innerHTML = currentData
      .map(
        (item) => `
          <tr>
            <td style="cursor: pointer;" onclick="openFolder('${item.id}')">${item.name || item.title || item.id}</td>
            <td>
              <div class="actions">
                <button class="open-btn" onclick="openFolder('${item.id}')"><i class="bi bi-folder2-open"></i></button>
                <button class="delete-btn" onclick="deleteItem('${item.id}')"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>`,
      )
      .join("");

    titleEl.innerHTML = `${isCollection ? "Documents" : "Collections"} in ${currentPath.at(-1).name}`;
  }

  async function addItem() {
    const names = currentData.map((item) => item.id);
    let itemId = isCollection ? "new-document" : "new-collection";
    itemId = getItemName(names, itemId);
    itemId = prompt("Enter item name", itemId);
    if (!itemId) return;

    await withLoading(async () => {
      const documentPath = `${pathString}/${isCollection ? itemId : `${itemId}/new-document`}`;
      await Firebase.createDocument(documentPath);
    });

    openFolder(itemId);
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

  async function importItems(file) {
    await withLoading(async () => {
      const data = await importData(file);

      // await Firebase.deleteItem(pathString);

      for (const item of data.items) {
        const documentPath = `${pathString}/${isCollection ? item.id : `${item.id}/new-document`}`;
        const documentData = isCollection ? item : {};
        await Firebase.createDocument(documentPath, documentData);
      }
    });

    loadData();
  }

  function exportItems() {
    exportData({ items: currentData });
  }

  return { open, close, addItem, toggleMenuModal, importItems, exportItems };
})();
