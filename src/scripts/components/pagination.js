export const createPagination = (
  containerElement,
  buttonElement,
  pageSize = 4,
) => {
  let visibleCount = pageSize;

  const update = () => {
    const cards = Array.from(containerElement.children);
    cards.forEach((cardElement, index) => {
      cardElement.hidden = index >= visibleCount;
    });
    buttonElement.hidden = visibleCount >= cards.length;
  };

  buttonElement.addEventListener("click", () => {
    visibleCount += pageSize;
    update();
  });

  update();
  return { update };
};
