import { expect, test } from "@playwright/test";

const login = async (page: Parameters<typeof test>[0]["page"]) => {
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
};

test("requires login before showing the board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).not.toBeVisible();
});

test("shows error on invalid login", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/username/i).fill("wrong");
  await page.getByLabel(/password/i).fill("credentials");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText("Invalid username or password.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).not.toBeVisible();
});

test("logs in, loads board, and can log out", async ({ page }) => {
  await page.goto("/");
  await login(page);

  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("adds a card to a column", async ({ page }) => {
  await page.goto("/");
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await page.goto("/");
  await login(page);
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("applies AI chat action and refreshes board", async ({ page }) => {
  let stateVersion = 1;
  const boardState = {
    columns: [
      { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
      { id: "col-discovery", title: "Discovery", cardIds: [] },
      { id: "col-progress", title: "In Progress", cardIds: [] },
      { id: "col-review", title: "Review", cardIds: [] },
      { id: "col-done", title: "Done", cardIds: [] },
    ],
    cards: {
      "card-1": {
        id: "card-1",
        title: "Refine status language",
        details: "Standardize column labels and tone across the board.",
      },
    },
  };

  await page.route("**/api/board", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "board-1",
          username: "user",
          title: "Kanban Studio",
          state: boardState,
          state_version: stateVersion,
          updated_at: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "board-1",
        username: "user",
        title: "Kanban Studio",
        state: boardState,
        state_version: ++stateVersion,
        updated_at: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/ai/chat", async (route) => {
    boardState.columns[0].cardIds = [];
    boardState.columns[3].cardIds = ["card-1"];
    stateVersion += 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        output_text: "Moved Refine status language from Backlog to Review.",
        applied_actions: ["Moved 'Refine status language' from 'Backlog' to 'Review'"],
        board_state_version: stateVersion,
      }),
    });
  });

  await page.goto("/");
  await login(page);

  const backlog = page.getByTestId("column-col-backlog");
  const review = page.getByTestId("column-col-review");

  await expect(backlog.getByTestId("card-card-1")).toBeVisible();

  await page.getByLabel(/prompt/i).fill("Move Refine status language to Review");
  await page.getByRole("button", { name: /^send$/i }).click();

  await expect(page.getByText(/moved refine status language from backlog to review/i)).toBeVisible();
  await expect(review.getByTestId("card-card-1")).toBeVisible();
  await expect(backlog.getByTestId("card-card-1")).toHaveCount(0);
});
