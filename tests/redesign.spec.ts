import { expect, test, type Page } from "@playwright/test";

const center = {
  centerId: "fc_design", name: "光序反馈中心", appId: "lumaris", env: "production",
  snMode: "whitelist", status: "enabled", secretVersion: 1, snList: ["lumaris-prod"],
  secretMasked: "••••••••", contact: "team@example.com", remark: "产品反馈",
  createdBy: "admin", createdAt: "2026-11-18T01:00:00Z", updatedAt: "2026-11-18T01:00:00Z",
};
const feedback = {
  feedback_no: "FB202611180001", client_id: "client_design", content: "切换应用后，反馈页面希望保留已填写的内容。",
  contact: "user@example.com", image_count: 0, extra: { app_name: "lumaris", platform: "iOS" },
  created_at: "2026-11-18T01:00:00Z", images: [],
};

async function mockApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith("/audit-logs")) data = { items: [], total: 0 };
    else if (path.endsWith("/codes")) {
      data = { centerId: center.centerId, sn: "lumaris-prod", timestamp: 1794963600, nonce: "design", code: "test-code", expireAt: "2026-11-18T02:00:00Z" };
    } else if (path === "/api/v1/feedbacks") data = { feedback_no: feedback.feedback_no };
    else if (path === "/api/v1/admin/feedback-centers") data = { items: [center], total: 1 };
    else if (path === "/api/v1/admin/feedbacks") data = { items: [feedback], total: 1 };
    else if (path === `/api/v1/admin/feedback-centers/${center.centerId}`) data = center;
    else if (path === `/api/v1/admin/feedbacks/${feedback.feedback_no}`) data = feedback;
    else throw new Error(`Unexpected API request ${path}`);
    await route.fulfill({ json: { code: 0, message: "ok", data } });
  });
}

async function connect(page: Page) {
  await page.goto("/");
  await page.getByLabel(/管理员 Token/).fill("design-test-token");
  await page.getByRole("button", { name: "连接服务" }).click();
  await expect(page.getByRole("heading", { name: "测试反馈", exact: true })).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test("persists appearance across entries and follows system changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass("dark");
  await page.getByRole("button", { name: "亮色模式", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass("light");
  await page.goto("/feedback");
  await expect(page.getByRole("button", { name: "亮色模式", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass("light");
});

test("keeps all admin pages and detail actions usable at every breakpoint", async ({ page }) => {
  await connect(page);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const theme of ["亮色模式", "暗黑模式"]) {
      await page.getByRole("button", { name: theme, exact: true }).filter({ visible: true }).click();
      await page.getByRole("button", { name: /^测试反馈/ }).filter({ visible: true }).click();
      await expectNoOverflow(page);
      await expect(page.getByRole("button", { name: "提交测试反馈" })).toBeVisible();
      await page.getByRole("button", { name: /反馈记录/ }).filter({ visible: true }).click();
      await expect(page.getByText(feedback.content)).toBeVisible();
      await expectNoOverflow(page);
      await page.getByRole("button", { name: `查看反馈 ${feedback.feedback_no}` }).click();
      await expect(page.getByRole("dialog", { name: "反馈详情", exact: true })).toBeVisible();
      await expectNoOverflow(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: /反馈中心/ }).filter({ visible: true }).click();
      await page.getByRole("button", { name: `查看反馈中心 ${center.name}` }).click();
      await expect(page.getByRole("dialog", { name: "反馈中心详情", exact: true })).toBeVisible();
      await expectNoOverflow(page);
      await page.keyboard.press("Escape");
    }
  }
});

test("centers dialogs fit the viewport and restore keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connect(page);
  await page.getByRole("button", { name: /反馈中心/ }).filter({ visible: true }).click();
  const trigger = page.getByRole("button", { name: "新建中心", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expectNoOverflow(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("public form stays responsive and submits in dark mode", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByRole("button", { name: "暗黑模式", exact: true }).click();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
  }
  await expect(page.getByRole("heading", { name: "遇到问题了？" })).toBeVisible();
  await page.getByLabel(/问题描述/).fill("页面设计验证");
  await page.getByLabel(/联系方式/).fill("user@example.com");
  await page.getByRole("button", { name: "提交反馈", exact: true }).click();
  await expect(page.getByRole("heading", { name: "反馈已收到" })).toBeVisible();
  await expectNoOverflow(page);
});
