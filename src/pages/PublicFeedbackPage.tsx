import { Input, Textarea } from "../components/ui/input";
import {
  Aperture,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ApiError, FeedbackAdminApi } from "../api";
import {
  ImageAttachmentField,
  useImageAttachments,
} from "../components/ImageAttachmentField";
import { Button, Field, Toast, type ToastMessage } from "../components/Ui";

const CLIENT_ID_KEY = "lens-feedback-public-client-id";
const APP_KEY = "lens-feedback-public-app";

interface PublicAppConfig {
  key: string;
  label: string;
  centerId: string;
  sn: string;
  appName: string;
}

function randomId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientId() {
  const current = localStorage.getItem(CLIENT_ID_KEY);
  if (current) return current;
  const next = randomId("web-user");
  localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function defaultAppLabel(appName: string) {
  if (appName === "lumaris") return "光序";
  if (appName === "lumalis") return "光汇";
  return appName;
}

function configuredApps(): PublicAppConfig[] {
  const raw = import.meta.env.VITE_FEEDBACK_APPS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item): item is Record<string, string> =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as Record<string, unknown>).key === "string" &&
              typeof (item as Record<string, unknown>).centerId === "string" &&
              typeof (item as Record<string, unknown>).sn === "string",
          )
          .map((item) => ({
            key: item.key,
            label: item.label || defaultAppLabel(item.appName || item.key),
            centerId: item.centerId,
            sn: item.sn,
            appName: item.appName || item.key,
          }));
      }
    } catch {
      // Fall through to the single-center configuration.
    }
  }

  const centerId = import.meta.env.VITE_FEEDBACK_CENTER_ID?.trim() || "";
  const sn = import.meta.env.VITE_FEEDBACK_SN?.trim() || "";
  const appName = import.meta.env.VITE_FEEDBACK_APP_NAME?.trim() || "lumaris";
  if (!centerId || !sn) return [];
  return [
    {
      key: appName,
      label: defaultAppLabel(appName),
      centerId,
      sn,
      appName,
    },
  ];
}

function getPublicConfig() {
  const query = new URLSearchParams(window.location.search);
  const apps = configuredApps();
  const requestedApp = query.get("app")?.trim();
  const storedApp = localStorage.getItem(APP_KEY);
  return {
    apps,
    initialAppKey:
      apps.find((item) => item.key === requestedApp)?.key ||
      apps.find((item) => item.key === storedApp)?.key ||
      apps[0]?.key ||
      "",
    apiBaseUrl: import.meta.env.VITE_FEEDBACK_API_BASE_URL?.trim() || "",
  };
}

export function PublicFeedbackPage() {
  const [config] = useState(getPublicConfig);
  const [clientId] = useState(getClientId);
  const [selectedAppKey, setSelectedAppKey] = useState(
    config.initialAppKey,
  );
  const [requestId, setRequestId] = useState(() => randomId("feedback"));
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNo, setFeedbackNo] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const api = useMemo(
    () => new FeedbackAdminApi(config.apiBaseUrl, "", "feedback-user"),
    [config.apiBaseUrl],
  );
  const selectedApp =
    config.apps.find((item) => item.key === selectedAppKey) ?? config.apps[0];
  const images = useImageAttachments({
    upload: (file, filename) =>
      api.uploadImage(file, filename, clientId),
    notify: setToast,
  });

  useEffect(() => {
    document.title = `问题反馈 · ${selectedApp?.label ?? "统一反馈"}`;
    return () => {
      document.title = "Lens Feedback Admin";
    };
  }, [selectedApp?.label]);

  const selectApp = (key: string) => {
    if (key === selectedAppKey) return;
    images.reset();
    setSelectedAppKey(key);
    localStorage.setItem(APP_KEY, key);
    setFeedbackNo("");
    setError("");
    setToast({ kind: "info", text: "已切换反馈应用" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedApp) {
      setError("反馈入口尚未配置");
      return;
    }
    if (!content.trim()) {
      setError("请描述你遇到的问题");
      return;
    }
    if (!contact.trim()) {
      setError("请留下手机号或邮箱，方便我们联系你");
      return;
    }
    if (images.uploading) {
      setError("图片还在上传，请稍候");
      return;
    }
    if (images.hasErrors) {
      setError("有图片上传失败，请重试或移除");
      return;
    }

    setSubmitting(true);
    try {
      const code = await api.issueClientCode(
        selectedApp.centerId,
        selectedApp.sn,
        clientId,
      );
      const result = await api.submitDebugFeedback(
        {
          request_id: requestId,
          content: content.trim(),
          contact: contact.trim(),
          attachment_ids: images.attachmentIds,
          extra: {
            app_name: selectedApp.appName,
            app_version: "web",
            platform: "web-user",
            page: "/feedback",
            source: "public-web",
          },
        },
        code,
        clientId,
      );
      setFeedbackNo(result.feedback_no);
      setToast({ kind: "success", text: "反馈已提交" });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        if (submitError.code === 40004) {
          setError("反馈入口配置无效，请联系管理员");
        } else if (submitError.code === 40006) {
          setError("本次提交已失效，请重新提交");
          setRequestId(randomId("feedback"));
        } else {
          setError(submitError.message);
        }
      } else {
        setError("提交失败，请稍后重试");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    images.reset();
    setFeedbackNo("");
    setContent("");
    setContact("");
    setError("");
    setRequestId(randomId("feedback"));
  };

    if (!selectedApp) {
    return (
      <main className="public-feedback-page public-feedback-missing">
        <div className="public-brand">
          <span className="public-brand-mark">
            <Aperture size={23} />
          </span>
          <div>
            <strong>统一反馈</strong>
            <span>FEEDBACK</span>
          </div>
        </div>
        <section className="public-feedback-card public-config-card">
          <CircleAlert size={28} />
          <h1>反馈入口尚未配置</h1>
          <p>
            当前页面缺少反馈中心 ID 或测试渠道。请联系管理员完成反馈入口配置。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-feedback-page">
      <header className="public-feedback-topbar">
        <div className="public-brand">
          <span className="public-brand-mark">
            <Aperture size={23} />
          </span>
          <div>
            <strong>统一反馈</strong>
            <span>光序 · 光汇</span>
          </div>
        </div>
        <span className="public-private-label">
          <ShieldCheck size={15} />
          匿名提交
        </span>
      </header>

      {feedbackNo ? (
        <section className="public-feedback-success">
          <span className="public-success-icon">
            <CheckCircle2 size={32} />
          </span>
          <span className="eyebrow">Feedback received</span>
          <h1>反馈已收到</h1>
          <p>
            已记录来自「{selectedApp.label}」的问题，我们会尽快查看处理。
          </p>
          <div className="public-feedback-number">
            <span>反馈编号</span>
            <code>{feedbackNo}</code>
          </div>
          <Button tone="primary" onClick={reset}>
            <RotateCcw size={16} />
            继续反馈
          </Button>
        </section>
      ) : (
        <>
          <section className="public-feedback-intro">
            <span className="eyebrow">Tell us what happened</span>
            <h1>遇到问题了？</h1>
            <p>
              描述发生了什么，必要时附上截图。信息越具体，我们越容易定位问题。
            </p>
          </section>

          <section className="public-feedback-card">
            <form className="public-feedback-form" onSubmit={submit}>
              <div className="public-form-heading">
                <span className="public-form-icon">
                  <MessageSquareText size={20} />
                </span>
                <div>
                  <h2>问题反馈</h2>
                  <p>预计 1 分钟完成</p>
                </div>
              </div>

              <div className="public-app-field">
                <span className="field-label">
                  问题出现在哪个软件
                </span>
                <div
                  className="public-app-switch"
                  role="radiogroup"
                  aria-label="选择问题所属软件"
                >
                  {config.apps.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={item.key === selectedApp.key}
                      className={
                        item.key === selectedApp.key ? "is-selected" : ""
                      }
                      disabled={submitting || images.uploading}
                      onClick={() => selectApp(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="问题描述" required>
                <Textarea
                  className="public-feedback-textarea"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="请描述操作步骤、遇到的问题以及你期望的结果"
                  maxLength={2000}
                  rows={8}
                />
                <span className="public-character-count">
                  {content.length} / 2000
                </span>
              </Field>

              <Field
                label="联系方式"
                required
                hint="仅用于跟进本次问题，不会公开显示。"
              >
                <Input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="手机号或邮箱"
                  maxLength={128}
                  autoComplete="email"
                />
              </Field>

              <ImageAttachmentField control={images} />

              {error && (
                <div className="public-form-error" role="alert">
                  <CircleAlert size={17} />
                  <span>{error}</span>
                </div>
              )}

              <div className="public-submit-row">
                <span>
                  <ShieldCheck size={15} />
                  请勿提交密码、验证码等敏感信息
                </span>
                <Button
                  tone="primary"
                  type="submit"
                  disabled={
                    submitting || images.uploading || images.hasErrors
                  }
                >
                  {submitting ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Send size={17} />
                  )}
                  {submitting ? "正在提交" : "提交反馈"}
                  {!submitting && <ArrowRight size={16} />}
                </Button>
              </div>
            </form>
          </section>
        </>
      )}

      <footer className="public-feedback-footer">
        <span>Lens Feedback</span>
        <span>匿名反馈 · 仅收集必要信息</span>
      </footer>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
