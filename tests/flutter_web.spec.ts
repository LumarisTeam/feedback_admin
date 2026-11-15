import { expect, test } from "@playwright/test";

const imageTestEnabled = process.env.FEEDBACK_TEST_IMAGE === "1";
const testPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("submits from Flutter Web and appears in admin API", async ({
  page,
  request,
}) => {
  const marker = `Flutter Web connectivity ${Date.now()}`;

  await page.goto("http://127.0.0.1:8081/");
  const accessibility = page.locator("flt-semantics-placeholder");
  await accessibility.waitFor({ state: "attached", timeout: 15_000 });
  if (await accessibility.count()) {
    await accessibility.evaluate((element) => (element as HTMLElement).click());
  }
  await expect(page.getByText("Flutter Web 反馈测试")).toBeVisible();

  const textboxes = page.getByRole("textbox");
  await expect(textboxes).toHaveCount(2);
  await page.mouse.click(640, 400);
  await page.keyboard.press("Control+A");
  await page.keyboard.type(marker);
  await page.keyboard.press("Tab");
  await textboxes.nth(1).fill("flutter-web@example.com");

  if (imageTestEnabled) {
    await page.locator('input[type="file"]').setInputFiles({
      name: "flutter-web.png",
      mimeType: "image/png",
      buffer: testPng,
    });
    await expect(page.getByText("继续添加图片")).toBeVisible({
      timeout: 15_000,
    });
  }

  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByText("反馈已提交")).toBeVisible({ timeout: 20_000 });

  const response = await request.get(
    "http://127.0.0.1:8080/api/v1/admin/feedbacks?app_name=lumaris&page=1&page_size=20",
    {
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_API_TOKEN ?? "local-admin-token"}`,
      },
    },
  );
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    data: { items: Array<{ content: string; image_count: number }> };
  };
  const item = body.data.items.find((item) => item.content === marker);
  expect(item).toBeTruthy();
  if (imageTestEnabled) {
    expect(item?.image_count).toBe(1);
  }

  await page.goto("http://127.0.0.1:5173/");
  await page
    .getByLabel(/管理员 Token/)
    .fill(process.env.ADMIN_API_TOKEN ?? "local-admin-token");
  await page.getByRole("button", { name: "连接服务" }).click();
  await expect(page.getByRole("heading", { name: "测试反馈" })).toBeVisible();
  await page.getByRole("button", { name: /反馈记录/ }).first().click();
  await expect(page.getByRole("heading", { name: "反馈记录" })).toBeVisible();
  await page.getByRole("button", { name: "刷新" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: marker }),
  ).toBeVisible({ timeout: 15_000 });
});

test("admin can log in with the direct backend URL", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/");
  await page.getByLabel(/API 地址/).fill("http://127.0.0.1:8080");
  await page
    .getByLabel(/管理员 Token/)
    .fill(process.env.ADMIN_API_TOKEN ?? "local-admin-token");
  await page.getByRole("button", { name: "连接服务" }).click();
  await expect(page.getByRole("heading", { name: "测试反馈" })).toBeVisible();
});
