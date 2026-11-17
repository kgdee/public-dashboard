const ConfirmModal = (() => {
  const element = document.querySelector(".confirm-modal");
  const titleEl = element.querySelector(".modal-title");
  const msgEl = element.querySelector(".msg");
  let resolveConfirm = null;

  function open(title, message) {
    return new Promise((resolve) => {
      titleEl.textContent = title;
      msgEl.textContent = message;
      element.classList.toggle("hidden", false);

      resolveConfirm = resolve;
    });
  }

  function confirm() {
    resolveConfirm?.(true);
    close();
  }

  function cancel() {
    resolveConfirm?.(false);
    close();
  }

  function close(result = false) {
    resolveConfirm = null;
    element.classList.toggle("hidden", true);
  }

  return { open, confirm, cancel };
})();
