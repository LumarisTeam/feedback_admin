const baseUrl = process.env.FEEDBACK_BASE_URL ?? "http://127.0.0.1:8080";
const token = process.env.ADMIN_API_TOKEN ?? "local-admin-token";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clientId = `admin-smoke-${runId}`;
const sn = `ADMIN-SMOKE-${runId}`.slice(0, 60);
const adminHeaders = {
  Authorization: `Bearer ${token}`,
  "X-Operator": "api-smoke",
  "Content-Type": "application/json",
};

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`[PASS] ${name}`);
    return;
  }
  failed += 1;
  console.error(`[FAIL] ${name}${detail ? ` (${detail})` : ""}`);
}

async function request(path, init = {}, expectOk = true) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  if (expectOk && (!response.ok || body?.code !== 0)) {
    throw new Error(
      `${init.method ?? "GET"} ${path} failed: HTTP ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return { response, body };
}

async function issueCode(centerId, expectOk = true) {
  return request(`/api/v1/feedback-centers/${centerId}/codes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-ID": clientId,
    },
    body: JSON.stringify({ sn }),
  }, expectOk);
}

async function submitCode(centerId, code, requestId, content) {
  return request(
    "/api/v1/feedbacks",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-ID": clientId,
        "X-Feedback-Center-Id": centerId,
        "X-Timestamp": String(code.timestamp),
        "X-SN": code.sn,
        "X-Nonce": code.nonce,
        "X-Code": code.code,
      },
      body: JSON.stringify({
        request_id: requestId,
        content,
        contact: "api-smoke@example.com",
        attachment_ids: [],
        extra: {
          page: "/admin/api-smoke",
          platform: "node-smoke",
          app_version: "debug",
        },
      }),
    },
    false,
  );
}

async function main() {
  const health = await request("/healthz");
  check("healthz", health.body?.code === 0, `HTTP ${health.response.status}`);

  const created = await request("/api/admin/feedback-centers", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: `Admin Smoke ${runId}`,
      appId: "lens-admin-smoke",
      env: "test",
      snMode: "whitelist",
      snList: [sn],
      expireAt: new Date(Date.now() + 86_400_000).toISOString(),
      contact: "api-smoke@example.com",
      remark: "Created by feedback_admin/scripts/api_smoke.mjs",
    }),
  });
  const centerId = created.body.data.centerId;
  check(
    "create feedback center",
    Boolean(centerId) && created.body.data.secret.startsWith("sk_"),
  );

  const updated = await request(`/api/v1/admin/feedback-centers/${centerId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({
      name: `Admin Smoke ${runId} Updated`,
      appId: "lens-admin-smoke",
      env: "test",
      snMode: "whitelist",
      snList: [sn],
      contact: "api-smoke-updated@example.com",
      remark: "Updated by feedback_admin/scripts/api_smoke.mjs",
    }),
  });
  check(
    "update feedback center",
    updated.body.data.name.endsWith("Updated") &&
      updated.body.data.contact === "api-smoke-updated@example.com",
  );

  const issued = await issueCode(centerId);
  const code = issued.body.data;
  check("issue one-time code", Boolean(code.code) && code.sn === sn);

  const requestId = `smoke-${runId}`;
  const submitted = await submitCode(
    centerId,
    code,
    requestId,
    "Admin feedback API smoke test.",
  );
  const feedbackNo = submitted.body?.data?.feedback_no;
  check(
    "submit feedback with code",
    submitted.response.status === 200 && Boolean(feedbackNo),
    `HTTP ${submitted.response.status}`,
  );

  const replayed = await submitCode(
    centerId,
    code,
    requestId,
    "Replay must be rejected.",
  );
  check(
    "reject consumed code",
    replayed.response.status === 409 &&
      replayed.body?.code === 40006,
    `HTTP ${replayed.response.status} code ${replayed.body?.code}`,
  );

  const idempotentCode = (await issueCode(centerId)).body.data;
  const idempotent = await submitCode(
    centerId,
    idempotentCode,
    requestId,
    "Idempotent retry.",
  );
  check(
    "idempotent retry returns same feedback_no",
    idempotent.response.status === 200 &&
      idempotent.body?.data?.feedback_no === feedbackNo,
  );

  const generated = await request(
    `/api/v1/admin/feedback-centers/${centerId}/codes/generate`,
    {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sn, ttl: 300 }),
    },
  );
  check("admin generate code", Boolean(generated.body.data.code));

  const reset = await request(
    `/api/v1/admin/feedback-centers/${centerId}/secret/reset`,
    { method: "POST", headers: adminHeaders },
  );
  check("reset center secret", reset.body.data.secretVersion === 2);

  const oldVersion = await submitCode(
    centerId,
    generated.body.data,
    `old-${requestId}`,
    "Code from old secret version.",
  );
  check(
    "reject code after secret reset",
    oldVersion.response.status === 401 &&
      oldVersion.body?.code === 40103,
    `HTTP ${oldVersion.response.status} code ${oldVersion.body?.code}`,
  );

  const listed = await request(
    "/api/v1/admin/feedbacks?app_name=lens-admin-smoke&page=1&page_size=20",
    { headers: adminHeaders },
  );
  check(
    "admin list contains feedback",
    listed.body.data.items.some((item) => item.feedback_no === feedbackNo),
  );

  const detail = await request(`/api/v1/admin/feedbacks/${feedbackNo}`, {
    headers: adminHeaders,
  });
  check(
    "admin feedback detail",
    detail.body.data.feedback_no === feedbackNo &&
      detail.body.data.extra.page === "/admin/api-smoke",
  );

  const audits = await request(
    `/api/v1/admin/feedback-centers/${centerId}/audit-logs?page=1&page_size=20`,
    { headers: adminHeaders },
  );
  check("feedback center audit log", audits.body.data.total >= 3);

  const disabled = await request(
    `/api/v1/admin/feedback-centers/${centerId}/status`,
    {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "disabled" }),
    },
  );
  check("disable feedback center", disabled.body.data.status === "disabled");
  const disabledIssue = await issueCode(centerId, false);
  check(
    "disabled center rejects code issue",
    disabledIssue.response.status === 403 &&
      disabledIssue.body?.code === 40102,
    `HTTP ${disabledIssue.response.status} code ${disabledIssue.body?.code}`,
  );

  const enabled = await request(
    `/api/v1/admin/feedback-centers/${centerId}/status`,
    {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "enabled" }),
    },
  );
  check("enable feedback center", enabled.body.data.status === "enabled");

  console.log(
    `\nAPI smoke result: ${passed} passed, ${failed} failed\ncenter_id=${centerId}\nfeedback_no=${feedbackNo}`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
