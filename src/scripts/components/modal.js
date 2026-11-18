let activePopup = null;
let previousFocus = null;
let focusableElements = [];

const handleEscUp = (evt) => {
  if (evt.key === "Escape") {
    closeModalWindow(activePopup);
  }
};

const handleTabDown = (evt) => {
  if (evt.key !== "Tab") return;
  const enabledElements = focusableElements.filter(
    (element) => !element.disabled,
  );
  const firstElement = enabledElements[0];
  const lastElement = enabledElements[enabledElements.length - 1];
  if (evt.shiftKey && document.activeElement === firstElement) {
    evt.preventDefault();
    lastElement.focus();
  } else if (!evt.shiftKey && document.activeElement === lastElement) {
    evt.preventDefault();
    firstElement.focus();
  }
};

export const openModalWindow = (modalWindow) => {
  previousFocus = document.activeElement;
  activePopup = modalWindow;
  modalWindow.classList.add("popup_is-opened");
  focusableElements = Array.from(modalWindow.querySelectorAll("button, input"));
  focusableElements[0].focus();
  document.body.style.overflow = "hidden";
  document.addEventListener("keyup", handleEscUp);
  document.addEventListener("keydown", handleTabDown);
};

export const closeModalWindow = (modalWindow) => {
  if (!modalWindow) return;
  modalWindow.classList.remove("popup_is-opened");
  activePopup = null;
  document.body.style.overflow = "";
  document.removeEventListener("keyup", handleEscUp);
  document.removeEventListener("keydown", handleTabDown);
  previousFocus?.focus();
};

export const setCloseModalWindowEventListeners = (modalWindow) => {
  const closeButtonElement = modalWindow.querySelector(".popup__close");
  closeButtonElement.addEventListener("click", () => {
    closeModalWindow(modalWindow);
  });

  modalWindow.addEventListener("mousedown", (evt) => {
    if (evt.target === modalWindow) {
      closeModalWindow(modalWindow);
    }
  });
};
