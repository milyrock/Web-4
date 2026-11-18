import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const screenshotDirectory = new URL("../report/screenshots/", import.meta.url);
let server;
let browser;
let baseUrl;

before(async () => {
  server = await createServer({
    root: projectRoot,
    server: { open: false, port: 0, host: "127.0.0.1" },
  });
  await server.listen();
  baseUrl = server.resolvedUrls.local[0];
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const openPage = async (context) => {
  const page = await browser.newPage({
    locale: "ru-RU",
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  context.after(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  await page.goto(baseUrl);
  await page.locator(".card").first().waitFor();
  return page;
};

const captureScreenshot = async (page, name) => {
  if (!process.env.CAPTURE_SCREENSHOTS) return;
  await mkdir(screenshotDirectory, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => image.decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, screenshotDirectory)),
    fullPage: true,
    animations: "disabled",
  });
};

const addPlace = async (page, name, priority = "5") => {
  await page
    .getByRole("button", { name: "Добавить место", exact: true })
    .click();
  await page.locator("#place-name").fill(name);
  await page
    .locator("#place-link")
    .fill(new URL("src/images/cards/baikal.jpg", baseUrl).href);
  await page.locator("#place-priority").fill(priority);
  await page.getByRole("button", { name: "Создать", exact: true }).click();
};

test("Галерея и пагинация", async (context) => {
  const page = await openPage(context);
  const visibleCards = page.locator(".card:visible");
  const moreButton = page.getByRole("button", { name: "Показать ещё" });
  assert.equal(await page.locator(".card").count(), 6);
  assert.equal(await visibleCards.count(), 4);
  await captureScreenshot(page, "01-gallery");

  const likeButton = visibleCards
    .first()
    .getByRole("button", { name: "Нравится" });
  await likeButton.click();
  assert.equal(await likeButton.getAttribute("aria-pressed"), "true");
  await likeButton.click();
  assert.equal(await likeButton.getAttribute("aria-pressed"), "false");

  await visibleCards.first().locator(".card__image").click();
  await page.locator(".popup_type_image").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator(".popup_type_image").waitFor({ state: "hidden" });
  await visibleCards.first().locator(".card__image").click();
  await page.locator(".popup_type_image .popup__close").click();
  await visibleCards.first().locator(".card__image").click();
  await page.locator(".popup_type_image").click({ position: { x: 5, y: 5 } });
  await page.locator(".popup_type_image").waitFor({ state: "hidden" });

  for (const name of ["Алтай", "Урал", "Кавказ", "Карелия"]) {
    await addPlace(page, name);
  }
  assert.equal(await page.locator(".card").count(), 10);
  assert.equal(await visibleCards.count(), 4);
  await moreButton.click();
  assert.equal(await visibleCards.count(), 8);
  await captureScreenshot(page, "08-more");
  await moreButton.click();
  assert.equal(await visibleCards.count(), 10);
  assert.equal(await moreButton.isVisible(), false);
  await visibleCards
    .first()
    .getByRole("button", { name: "Удалить карточку" })
    .click();
  assert.equal(await visibleCards.count(), 9);
});

test("Новое место", async (context) => {
  const page = await openPage(context);
  await page
    .getByRole("button", { name: "Добавить место", exact: true })
    .click();
  const nameInput = page.locator("#place-name");
  const priorityInput = page.locator("#place-priority");
  const submitButton = page.getByRole("button", {
    name: "Создать",
    exact: true,
  });
  assert.equal(await submitButton.isDisabled(), true);
  await nameInput.fill("Байкал1");
  assert.match(
    await page.locator("#place-name-error").textContent(),
    /Разрешены только/,
  );
  await captureScreenshot(page, "02-base-error");
  await nameInput.fill("А");
  assert.equal(
    await nameInput.evaluate((input) => input.validity.tooShort),
    true,
  );
  assert.notEqual(await page.locator("#place-name-error").textContent(), "");
  await nameInput.fill("");
  assert.equal(
    await nameInput.evaluate((input) => input.validity.valueMissing),
    true,
  );
  await captureScreenshot(page, "03-required-error");
  await nameInput.fill("Байкал");
  await page.locator("#place-link").fill("не-ссылка");
  assert.equal(await submitButton.isDisabled(), true);
  assert.equal(
    await page
      .locator("#place-link")
      .evaluate((input) => input.validity.typeMismatch),
    true,
  );
  await page
    .locator("#place-link")
    .fill(new URL("src/images/cards/baikal.jpg", baseUrl).href);

  for (const priority of ["0", "11", "01", "-1", "2.5", "abc"]) {
    await priorityInput.fill(priority);
    assert.equal(
      await page.locator("#place-priority-error").textContent(),
      "Число от 1 до 10",
    );
    assert.equal(await submitButton.isDisabled(), true);
  }
  await priorityInput.fill("11");
  await captureScreenshot(page, "04-priority-error");
  for (const priority of ["1", "10"]) {
    await priorityInput.fill(priority);
    assert.equal(await submitButton.isEnabled(), true);
  }
  await captureScreenshot(page, "05-priority-valid");
  await submitButton.click();
  assert.equal(await page.locator(".card").count(), 7);
  assert.equal(await page.locator(".card:visible").count(), 4);
  assert.equal(
    await page.locator(".card").first().getAttribute("data-priority"),
    "10",
  );
  await captureScreenshot(page, "06-created");
  await page
    .getByRole("button", { name: "Добавить место", exact: true })
    .click();
  assert.equal(await nameInput.inputValue(), "");
  assert.equal(await priorityInput.inputValue(), "");
  assert.equal(await submitButton.isDisabled(), true);
  assert.equal(
    await page.locator(".popup_type_new-card .popup__error_visible").count(),
    0,
  );
  await captureScreenshot(page, "07-cleared");
  await nameInput.fill("Место1");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Добавить место", exact: true })
    .click();
  assert.equal(
    await nameInput.evaluate((input) => input.validity.customError),
    false,
  );
  assert.equal(
    await page.locator(".popup_type_new-card .popup__error_visible").count(),
    0,
  );
});

test("Профиль и аватар", async (context) => {
  const page = await openPage(context);
  const editButton = page.getByRole("button", {
    name: "Редактировать профиль",
    exact: true,
  });
  await editButton.click();
  const profilePopup = page.locator(".popup_type_edit");
  const submitButton = profilePopup.getByRole("button", { name: "Сохранить" });
  assert.equal(await page.locator("#user-name").inputValue(), "Жак-Ив Кусто");
  assert.equal(await submitButton.isDisabled(), true);
  await page.locator("#user-name").fill("Автор1");
  await page.keyboard.press("Escape");
  await editButton.click();
  assert.equal(
    await page
      .locator("#user-name")
      .evaluate((input) => input.validity.customError),
    false,
  );
  assert.equal(await page.locator("#user-name-error").textContent(), "");
  await page.locator("#user-description").fill("Путешественник");
  assert.equal(await submitButton.isEnabled(), true);
  await submitButton.click();
  assert.equal(
    await page.locator(".profile__description").textContent(),
    "Путешественник",
  );

  await page.getByRole("button", { name: "Обновить аватар" }).click();
  const avatarPopup = page.locator(".popup_type_edit-avatar");
  const avatarSubmit = avatarPopup.getByRole("button", { name: "Сохранить" });
  await page.locator("#user-avatar").fill("ошибка");
  assert.equal(await avatarSubmit.isDisabled(), true);
  const avatarUrl = new URL("src/images/cards/baikal.jpg", baseUrl).href;
  await page.locator("#user-avatar").fill(avatarUrl);
  await avatarSubmit.click();
  assert.match(
    await page.locator(".profile__image").getAttribute("style"),
    /baikal\.jpg/,
  );
  await page.getByRole("button", { name: "Обновить аватар" }).click();
  assert.equal(await page.locator("#user-avatar").inputValue(), "");
  assert.equal(await avatarSubmit.isDisabled(), true);
});

test("Мобильный экран и клавиатура", async (context) => {
  const page = await openPage(context);
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const addButton = page.getByRole("button", {
    name: "Добавить место",
    exact: true,
  });
  await addButton.focus();
  await page.keyboard.press("Enter");
  await page.locator(".popup_type_new-card").waitFor({ state: "visible" });
  await page.locator("#place-priority").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator(".popup_type_new-card .popup__close")
      .evaluate((button) => button === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await addButton.evaluate((button) => button === document.activeElement),
    true,
  );
});
