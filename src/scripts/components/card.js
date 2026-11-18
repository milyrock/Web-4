export const likeCard = (likeButton) => {
  const isLiked = likeButton.classList.toggle("card__like-button_is-active");
  likeButton.setAttribute("aria-pressed", String(isLiked));
};

export const deleteCard = (cardElement) => {
  cardElement.remove();
};

const cardTemplate = document
  .getElementById("card-template")
  .content.querySelector(".card");

const getTemplate = () => cardTemplate.cloneNode(true);

export const createCardElement = (
  data,
  { onPreviewPicture, onLikeIcon, onDeleteCard },
) => {
  const cardElement = getTemplate();
  const likeButton = cardElement.querySelector(".card__like-button");
  const deleteButton = cardElement.querySelector(
    ".card__control-button_type_delete",
  );
  const cardImage = cardElement.querySelector(".card__image");

  cardImage.src = data.link;
  cardImage.alt = data.name;
  cardImage.setAttribute("aria-label", `Открыть фото: ${data.name}`);
  cardElement.dataset.priority = String(data.priority ?? 1);
  cardElement.querySelector(".card__title").textContent = data.name;
  cardElement.querySelector(".card__priority").textContent =
    `Приоритет: ${data.priority ?? 1}`;

  if (onLikeIcon) {
    likeButton.addEventListener("click", () => onLikeIcon(likeButton));
  }

  if (onDeleteCard) {
    deleteButton.addEventListener("click", () => onDeleteCard(cardElement));
  }

  if (onPreviewPicture) {
    cardImage.addEventListener("click", () =>
      onPreviewPicture({ name: data.name, link: data.link }),
    );
    cardImage.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        onPreviewPicture({ name: data.name, link: data.link });
      }
    });
  }

  return cardElement;
};
