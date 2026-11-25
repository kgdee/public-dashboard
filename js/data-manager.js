const DataManager = (() => {
  const element = document.querySelector(".data-manager");
  const messageEl = element.querySelector(".message");

  function render() {
    const isDataArray = currentData && Array.isArray(currentData);
    const hasData = (!isDataArray && currentData) || (isDataArray && currentData.length > 0);

    ItemsManager.close();
    DocumentManager.close();

    if (!hasData) {
      messageEl.textContent = "No data";
    } else if (Array.isArray(currentData)) {
      ItemsManager.open();
    } else {
      DocumentManager.open();
    }

    messageEl.classList.toggle("hidden", hasData);
  }

  return {
    render,
  };
})();
