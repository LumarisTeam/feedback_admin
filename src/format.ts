const dateTime = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

const dateOnly = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Shanghai",
});

export function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}

export function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateOnly.format(date);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function toRFC3339(date: string, endOfDay = false) {
  if (!date) return "";
  const local = new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(local.getTime()) ? "" : local.toISOString();
}

export function compactJSON(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export function actionLabel(action: string) {
  const labels: Record<string, string> = {
    create: "创建中心",
    update: "更新配置",
    enable: "启用中心",
    disable: "禁用中心",
    reset_secret: "重置密钥",
    generate_code: "生成校验码",
  };
  return labels[action] ?? action;
}

export function extraValue(
  extra: Record<string, unknown> | null,
  key: string,
): string {
  const value = extra?.[key];
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
