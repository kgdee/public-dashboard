const ValueModal = (() => {
  const element = document.querySelector(".value-modal");

  let currentIndex = null;

  element.querySelectorAll(".item-list .item").forEach((el) => el.addEventListener("click", close));

  function inputFile(file) {
    DataManager.DocumentManager.replaceValue(currentIndex, file);
  }

  function inputId() {
    DataManager.DocumentManager.replaceValue(currentIndex, `"${generateId()}"`);
  }

  function inputUsername() {
    DataManager.DocumentManager.replaceValue(currentIndex, `"${generateUserName()}"`);
  }

  function inputObject() {
    DataManager.DocumentManager.replaceValue(currentIndex, `{"key_0":"Value","key_1":"Value"}`);
  }

  function open(index) {
    currentIndex = index;
    element.classList.toggle("hidden", false);
  }

  function close() {
    element.classList.toggle("hidden", true);
  }

  return { open, close, inputFile, inputId, inputUsername, inputObject };
})();
