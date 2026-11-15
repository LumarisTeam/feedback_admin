import { expect, test } from "@playwright/test";

const token = process.env.ADMIN_API_TOKEN ?? "local-admin-token";
const imageTestEnabled = process.env.FEEDBACK_TEST_IMAGE === "1";
const testPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function connect(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "连接反馈服务" })).toBeVisible();
  await page.getByLabel(/管理员 Token/).fill(token);
  await page.getByRole("button", { name: "连接服务" }).click();
  await expect(page.getByRole("heading", { name: "测试反馈" })).toBeVisible();
}

test("creates a center and completes a real debug feedback flow", async ({
  page,
}, testInfo) => {
  const suffix = `${Date.now()}`.slice(-8);
  const centerName = `UI Smoke ${suffix}`;
  const marker = `Playwright UI feedback ${suffix}`;

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("desktop-login.png"),
    fullPage: true,
  });

  await page.getByLabel(/管理员 Token/).fill(token);
  await page.getByRole("button", { name: "连接服务" }).click();
  await expect(page.getByRole("heading", { name: "测试反馈" })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-test-form.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /反馈中心/ }).first().click();
  await expect(page.getByRole("heading", { name: "反馈中心" })).toBeVisible();
  await page.getByRole("button", { name: "新建中心" }).first().click();

  const form = page.getByRole("dialog");
  await form.getByLabel(/名称/).fill(centerName);
  await form.getByLabel(/AppID/).fill("lens-ui-smoke");
  await form.getByLabel(/环境/).fill("test");
  await form.getByLabel(/SN 列表/).fill(`UI-SMOKE-${suffix}`);
  await form.getByLabel(/联系人/).fill("ui-smoke@example.com");
  await form.getByLabel(/备注/).fill("Created by Playwright");
  await page.screenshot({
    path: testInfo.outputPath("desktop-create-center.png"),
    fullPage: true,
  });
  await form.getByRole("button", { name: "创建中心" }).click();

  await expect(
    page.getByRole("heading", { name: "反馈中心已创建" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-secret.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "我已保存" }).click();

  const centerRow = page.getByRole("row").filter({ hasText: centerName });
  await expect(centerRow).toBeVisible();
  await centerRow.click();
  const centerDrawer = page.getByRole("complementary", {
    name: "反馈中心详情",
  });
  await expect(centerDrawer).toBeVisible();

  await page.getByRole("button", { name: "测试码" }).click();
  await expect(
    page.getByRole("heading", { name: "生成测试校验码" }),
  ).toBeVisible();
  const codeDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "生成测试校验码" }),
  });
  await codeDialog.getByRole("button", { name: "生成", exact: true }).click();
  await expect(page.locator(".generated-code")).toBeVisible();
  await codeDialog
    .getByRole("button", { name: "关闭", exact: true })
    .last()
    .click();

  await page.getByRole("button", { name: "禁用", exact: true }).click();
  await page.getByRole("button", { name: "确认禁用" }).click();
  await expect(
    centerDrawer.getByText("已禁用", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "启用", exact: true }).click();
  await page.getByRole("button", { name: "确认启用" }).click();
  await expect(
    centerDrawer.getByText("已启用", { exact: true }),
  ).toBeVisible();
  await centerDrawer.getByRole("button", { name: "关闭详情" }).click();

  await page.getByRole("button", { name: /测试反馈/ }).first().click();
  await expect(page.getByRole("heading", { name: "测试反馈" })).toBeVisible();
  await page
    .getByLabel(/测试反馈中心/)
    .selectOption({ label: `${centerName} · lens-ui-smoke / test` });
  await expect(page.getByLabel(/测试渠道/)).toHaveValue(
    `UI-SMOKE-${suffix}`,
  );
  await page.getByLabel(/联系方式/).fill("13800000000");
  await page.getByLabel(/反馈内容/).fill(marker);
  if (imageTestEnabled) {
    await page.getByLabel("选择图片附件").setInputFiles({
      name: "smoke-test.png",
      mimeType: "image/png",
      buffer: testPng,
    });
    await expect(page.getByText("已就绪", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("desktop-debug-image.png"),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "提交测试反馈" }).click();

  await expect(page.getByText("提交成功", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  const feedbackNo = await page.locator(".copy-row code").first().textContent();
  expect(feedbackNo).toMatch(/^FB/);
  await page.screenshot({
    path: testInfo.outputPath("desktop-debug-result.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "查看反馈" }).click();
  await expect(page.getByRole("heading", { name: "反馈记录" })).toBeVisible();
  await page.getByRole("button", { name: "刷新" }).click();
  const row = page.getByRole("row").filter({ hasText: marker });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
  await expect(
    page.locator(".feedback-content").filter({ hasText: marker }),
  ).toBeVisible();
  if (imageTestEnabled) {
    await expect(
      page.getByRole("heading", { name: "图片附件" }),
    ).toBeVisible();
    await expect(page.locator(".image-tile")).toHaveCount(1);
  }
  await page.screenshot({
    path: testInfo.outputPath("desktop-feedback-detail.png"),
    fullPage: true,
  });
});

test("keeps the admin usable on a mobile viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connect(page);

  const hasBodyOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasBodyOverflow).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("mobile-test-form.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /反馈中心/ }).first().click();
  await expect(page.getByRole("heading", { name: "反馈中心" })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-centers.png"),
    fullPage: true,
  });
});
