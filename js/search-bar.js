const SearchBar = (() => {
  const element = document.querySelector(".search-bar");
  const textInput = element.querySelector("input");

  function search() {
    const query = textInput.value.toLowerCase().trim();

    const filtered = currentData.filter((item) => {
      return Object.values(item).some((value) => {
        // Ignore nested objects or arrays to prevent "[object Object]" false positives
        if (value && typeof value === "object") return false;

        return String(value).toLowerCase().includes(query);
      });
    });

    DataManager.render(filtered);
  }

  function toggle(force) {
    const shouldHide = force !== undefined ? !force : undefined;
    textInput.value = "";
    element.classList.toggle("hidden", shouldHide);
    if (!shouldHide) textInput.focus();
    else DataManager.render();
  }

  function forceClose() {
    element.classList.toggle("hidden", true);
  }

  return { toggle, search, forceClose };
})();
