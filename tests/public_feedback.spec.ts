import { expect, test } from "@playwright/test";

const imageTestEnabled = process.env.FEEDBACK_TEST_IMAGE === "1";
const testPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("submits a feedback for the selected app", async ({
  page,
  request,
}, testInfo) => {
  const marker = `Public feedback ${Date.now()}`;

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/feedback");
  await expect(page.getByRole("heading", { name: "遇到问题了？" })).toBeVisible();

  await page.getByRole("radio", { name: "光汇" }).click();
  await expect(page.getByRole("radio", { name: "光汇" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByLabel(/问题描述/).fill(marker);
  await page.getByLabel(/联系方式/).fill("user@example.com");

  if (imageTestEnabled) {
    await page.getByLabel("选择图片附件").setInputFiles({
      name: "user-screenshot.png",
      mimeType: "image/png",
      buffer: testPng,
    });
    await expect(page.getByText("已就绪", { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByRole("heading", { name: "反馈已收到" })).toBeVisible();
  await expect(page.getByText(/已记录来自「光汇」的问题/)).toBeVisible();
  await expect(page.locator(".public-feedback-number code")).toHaveText(/^FB/);

  const response = await request.get(
    "http://127.0.0.1:8080/api/v1/admin/feedbacks?app_name=lumalis&page=1&page_size=20",
    {
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_API_TOKEN ?? "local-admin-token"}`,
      },
    },
  );
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    data: { items: Array<{ content: string }> };
  };
  expect(body.data.items.some((item) => item.content === marker)).toBe(true);

  await page.screenshot({
    path: testInfo.outputPath("public-feedback-success.png"),
    fullPage: true,
  });
});

test("keeps the public feedback form usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/feedback");
  await expect(page.getByRole("heading", { name: "遇到问题了？" })).toBeVisible();

  const hasBodyOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasBodyOverflow).toBe(false);
});
