import { Input, Textarea, NativeSelect } from "./ui/input";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Field, Modal } from "./Ui";
import type {
  CenterInput,
  FeedbackCenterDetail,
  SNMode,
} from "../types";

const defaultForm = {
  name: "",
  appId: "",
  env: "prod",
  snMode: "whitelist" as SNMode,
  snText: "",
  expireAt: "",
  contact: "",
  remark: "",
};

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toISOString(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function CenterFormDialog({
  open,
  center,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  center: FeedbackCenterDetail | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: CenterInput) => void;
}) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      center
        ? {
            name: center.name,
            appId: center.appId,
            env: center.env,
            snMode: center.snMode,
            snText: center.snList.join("\n"),
            expireAt: toLocalDateTime(center.expireAt),
            contact: center.contact,
            remark: center.remark,
          }
        : defaultForm,
    );
  }, [center, open]);

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("请输入反馈中心名称");
      return;
    }
    if (!form.appId.trim()) {
      setError("请输入 AppID");
      return;
    }
    const snList = form.snText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (form.snMode !== "any" && snList.length === 0) {
      setError("白名单或前缀模式下至少需要配置一个 SN");
      return;
    }
    onSubmit({
      name: form.name.trim(),
      appId: form.appId.trim(),
      env: form.env.trim() || "prod",
      snMode: form.snMode,
      snList,
      expireAt: toISOString(form.expireAt),
      contact: form.contact.trim(),
      remark: form.remark.trim(),
    });
  };

  return (
    <Modal
      open={open}
      title={center ? "编辑反馈中心" : "新建反馈中心"}
      description={
        center
          ? "修改应用接入参数，保存后会刷新中心缓存。"
          : "一个应用环境对应一个反馈中心。"
      }
      onClose={onClose}
      wide
    >
      <form className="form-grid" onSubmit={submit}>
        <Field label="名称" required>
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="光序生产中心"
            autoFocus
          />
        </Field>
        <Field label="AppID" required>
          <Input
            value={form.appId}
            onChange={(event) => update("appId", event.target.value)}
            placeholder="lumaris"
          />
        </Field>
        <Field label="环境" required>
          <Input
            value={form.env}
            onChange={(event) => update("env", event.target.value)}
            placeholder="prod"
          />
        </Field>
        <Field label="SN 模式" required>
          <NativeSelect
            value={form.snMode}
            onChange={(event) => update("snMode", event.target.value as SNMode)}
          >
            <option value="whitelist">白名单</option>
            <option value="prefix">前缀匹配</option>
            <option value="any">允许任意 SN</option>
          </NativeSelect>
        </Field>
        <Field
          label="SN 列表"
          required={form.snMode !== "any"}
          hint="每行一个，也可用逗号分隔。"
        >
          <Textarea
            rows={4}
            value={form.snText}
            onChange={(event) => update("snText", event.target.value)}
            placeholder={"lumaris-prod\nlumalis-prod"}
            disabled={form.snMode === "any"}
          />
        </Field>
        <Field label="到期时间">
          <Input
            type="datetime-local"
            value={form.expireAt}
            onChange={(event) => update("expireAt", event.target.value)}
          />
        </Field>
        <Field label="联系人">
          <Input
            value={form.contact}
            onChange={(event) => update("contact", event.target.value)}
            placeholder="dev@example.com"
          />
        </Field>
        <Field label="备注">
          <Textarea
            rows={2}
            value={form.remark}
            onChange={(event) => update("remark", event.target.value)}
            placeholder="用途、负责人或发布说明"
          />
        </Field>

        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions form-actions">
          <Button type="button" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button tone="primary" type="submit" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={16} />}
            {center ? "保存修改" : "创建中心"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
