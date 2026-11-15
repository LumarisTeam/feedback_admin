import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clipboard,
  Code2,
  DatabaseZap,
  ExternalLink,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Send,
  TerminalSquare,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FeedbackAdminApi } from "../api";
import { ApiError } from "../api";
import { PageHeader } from "../components/AppShell";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  type ToastMessage,
} from "../components/Ui";
import { compactJSON, formatDateTime } from "../format";
import { prepareImage } from "../image";
import type {
  CenterStatus,
  FeedbackCenterDetail,
  FeedbackCenterListItem,
  GeneratedCode,
} from "../types";

function randomId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function storedClientId() {
  const key = "lens-feedback-debug-client-id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = randomId("admin-debug");
  localStorage.setItem(key, next);
  return next;
}

const defaultExtra = `{
  "page": "/web-manual-test",
  "platform": "web-admin",
  "app_version": "manual"
}`;

const MAX_IMAGE_COUNT = 6;

interface AttachmentDraft {
  key: string;
  file: File;
  name: string;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  attachmentId?: number;
  error?: string;
}

export function DebugPage({
  api,
  notify,
  onGoCenters,
  onGoFeedbacks,
}: {
  api: FeedbackAdminApi;
  notify: (toast: ToastMessage) => void;
  onGoCenters: () => void;
  onGoFeedbacks: () => void;
}) {
  const [centers, setCenters] = useState<FeedbackCenterListItem[]>([]);
  const [centerId, setCenterId] = useState("");
  const [center, setCenter] = useState<FeedbackCenterDetail | null>(null);
  const [sn, setSn] = useState("");
  const [clientId, setClientId] = useState(storedClientId);
  const [requestId, setRequestId] = useState(() => randomId("manual"));
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [extraText, setExtraText] = useState(defaultExtra);
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [loadingCenter, setLoadingCenter] = useState(false);
  const [busyAction, setBusyAction] = useState<
    "submit" | "code" | "replay" | null
  >(null);
  const [lastCode, setLastCode] = useState<GeneratedCode | null>(null);
  const [feedbackNo, setFeedbackNo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [draggingImages, setDraggingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    let active = true;
    setLoadingCenters(true);
    api
      .listCenters({
        keyword: "",
        status: "enabled" as CenterStatus,
        page: 1,
        pageSize: 100,
      })
      .then((result) => {
        if (!active) return;
        const available = result.items ?? [];
        setCenters(available);
        setCenterId((current) => current || available[0]?.centerId || "");
      })
      .catch((loadError) => {
        if (!active) return;
        notify({
          kind: "error",
          text:
            loadError instanceof Error
              ? loadError.message
              : "加载反馈中心失败",
        });
      })
      .finally(() => {
        if (active) setLoadingCenters(false);
      });
    return () => {
      active = false;
    };
  }, [api, notify]);

  useEffect(() => {
    if (!centerId) {
      setCenter(null);
      setSn("");
      return;
    }
    let active = true;
    setLoadingCenter(true);
    api
      .getCenter(centerId)
      .then((detail) => {
        if (!active) return;
        setCenter(detail);
        setSn(detail.snList[0] ?? "");
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error ? loadError.message : "加载中心详情失败",
        );
      })
      .finally(() => {
        if (active) setLoadingCenter(false);
      });
    return () => {
      active = false;
    };
  }, [api, centerId]);

  const parsedExtra = useMemo(() => {
    try {
      const value = JSON.parse(extraText) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { value: null, error: "扩展字段必须是 JSON 对象" };
      }
      return { value: value as Record<string, unknown>, error: "" };
    } catch {
      return { value: null, error: "扩展字段不是合法 JSON" };
    }
  }, [extraText]);

  const hasUploadingImages = attachments.some(
    (item) => item.status === "uploading",
  );
  const hasImageErrors = attachments.some((item) => item.status === "error");
  const uploadedAttachmentIds = attachments
    .filter(
      (item): item is AttachmentDraft & { attachmentId: number } =>
        item.status === "uploaded" && item.attachmentId !== undefined,
    )
    .map((item) => item.attachmentId);

  const trackPreviewUrl = (url: string) => {
    previewUrlsRef.current.add(url);
    return url;
  };

  const releasePreviewUrl = (url: string) => {
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  };

  const uploadAttachment = async (draft: AttachmentDraft) => {
    setAttachments((current) =>
      current.map((item) =>
        item.key === draft.key
          ? { ...item, status: "uploading", error: undefined }
          : item,
      ),
    );
    try {
      const prepared = await prepareImage(draft.file);
      const attachmentId = await api.uploadImage(
        prepared.blob,
        prepared.filename,
        clientId.trim(),
      );
      setAttachments((current) =>
        current.map((item) =>
          item.key === draft.key
            ? {
                ...item,
                status: "uploaded",
                attachmentId,
                error: undefined,
              }
            : item,
        ),
      );
    } catch (uploadError) {
      setAttachments((current) =>
        current.map((item) =>
          item.key === draft.key
            ? {
                ...item,
                status: "error",
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "图片上传失败",
              }
            : item,
        ),
      );
    }
  };

  const addImages = (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    const room = MAX_IMAGE_COUNT - attachments.length;
    if (room <= 0) {
      notify({ kind: "error", text: `最多添加 ${MAX_IMAGE_COUNT} 张图片` });
      return;
    }
    if (selected.length > room) {
      notify({
        kind: "info",
        text: `最多 ${MAX_IMAGE_COUNT} 张，本次只加入前 ${room} 张`,
      });
    }
    const accepted = selected.slice(0, room);
    const drafts = accepted.map((file) => ({
      key: randomId("attachment"),
      file,
      name: file.name,
      previewUrl: trackPreviewUrl(URL.createObjectURL(file)),
      status: "uploading" as const,
    }));
    setAttachments((current) => [...current, ...drafts]);
    drafts.forEach((draft) => {
      void uploadAttachment(draft);
    });
  };

  const removeImage = (key: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.key === key);
      if (target) releasePreviewUrl(target.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  };

  const retryImage = (key: string) => {
    const target = attachments.find((item) => item.key === key);
    if (target) void uploadAttachment(target);
  };

  const validate = () => {
    if (!centerId) return "请选择反馈中心";
    if (!sn.trim()) return "请选择或填写测试渠道";
    if (!clientId.trim()) return "Client ID 不能为空";
    if (!requestId.trim()) return "Request ID 不能为空";
    if (!content.trim()) return "请填写反馈内容";
    if (!contact.trim()) return "请填写联系方式";
    if (parsedExtra.error) return parsedExtra.error;
    if (hasUploadingImages) return "图片仍在上传，请稍候";
    if (hasImageErrors) return "有图片上传失败，请重试或移除";
    return "";
  };

  const issueCode = async () => {
    setError("");
    setMessage("");
    const validation = validate();
    if (validation) {
      setError(validation);
      return null;
    }
    const code = await api.issueClientCode(centerId, sn.trim(), clientId.trim());
    setLastCode(code);
    return code;
  };

  const onlyIssueCode = async () => {
    setBusyAction("code");
    try {
      await issueCode();
      setMessage("校验码已签发，可以继续提交当前反馈。");
    } catch (issueError) {
      setError(
        issueError instanceof Error ? issueError.message : "签发校验码失败",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const submit = async (replay = false) => {
    const action = replay ? "replay" : "submit";
    setBusyAction(action);
    setError("");
    setMessage("");
    setFeedbackNo("");
    try {
      let code = replay ? lastCode : null;
      if (!code) {
        code = await issueCode();
      }
      if (!code) return;

      const result = await api.submitDebugFeedback(
        {
          request_id: requestId.trim(),
          content: content.trim(),
          contact: contact.trim(),
          attachment_ids: uploadedAttachmentIds,
          extra: parsedExtra.value ?? {},
        },
        code,
        clientId.trim(),
      );
      setFeedbackNo(result.feedback_no);
      setMessage(
        replay
          ? "重放请求已通过。"
          : "提交成功，反馈已经写入本地反馈中心。",
      );
      if (!replay) {
        setRequestId(randomId("manual"));
      }
      notify({ kind: "success", text: "测试反馈提交成功" });
    } catch (submitError) {
      const text =
        submitError instanceof ApiError
          ? `${submitError.message}${submitError.code > 0 ? `（code ${submitError.code}）` : ""}`
          : "提交失败";
      setError(text);
      if (
        replay &&
        submitError instanceof ApiError &&
        submitError.code === 40006
      ) {
        setMessage("校验码重放已被后端拦截，防重放链路正常。");
      }
    } finally {
      setBusyAction(null);
    }
  };

  const resetTest = () => {
    attachments.forEach((item) => releasePreviewUrl(item.previewUrl));
    setAttachments([]);
    setRequestId(randomId("manual"));
    setLastCode(null);
    setFeedbackNo("");
    setError("");
    setMessage("");
    setContent("");
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify({ kind: "info", text: `${label}已复制` });
    } catch {
      notify({ kind: "error", text: "复制失败，请手动选择文本" });
    }
  };

  if (!loadingCenters && centers.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Manual feedback test"
          title="测试反馈"
          description="手工填写并提交一条真实反馈。"
        />
        <section className="data-panel">
          <EmptyState
            icon={<TerminalSquare size={24} />}
            title="没有可用的反馈中心"
            description="先创建一个已启用的反馈中心，并配置至少一个测试渠道。"
            action={
              <Button tone="primary" onClick={onGoCenters}>
                前往反馈中心
              </Button>
            }
          />
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Manual feedback test"
        title="测试反馈"
        description="填写反馈内容并提交，页面会显示后端返回的反馈编号。"
        actions={
          <>
            <Button
              onClick={() =>
                window.open("/feedback", "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink size={16} />
              打开用户端
            </Button>
            <Button onClick={resetTest}>
              <RotateCcw size={16} />
              开始新测试
            </Button>
          </>
        }
      />

      <div className="debug-layout">
        <section className="work-panel manual-form-panel">
          <div className="panel-heading">
            <div>
              <h2>填写反馈</h2>
              <p>提交后会经过真实取码、校验和入库流程。</p>
            </div>
            {loadingCenter && <LoaderCircle className="spin" size={18} />}
          </div>

          <div className="form-grid">
            <Field label="测试反馈中心" required>
              <select
                value={centerId}
                onChange={(event) => setCenterId(event.target.value)}
                disabled={loadingCenters}
              >
                {centers.map((item) => (
                  <option key={item.centerId} value={item.centerId}>
                    {item.name} · {item.appId} / {item.env}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="测试渠道" required>
              {center?.snMode === "any" ? (
                <input
                  value={sn}
                  onChange={(event) => setSn(event.target.value)}
                  placeholder="例如 lumaris-prod"
                />
              ) : (
                <select
                  value={sn}
                  onChange={(event) => setSn(event.target.value)}
                  disabled={loadingCenter}
                >
                  {center?.snList.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="联系方式" required>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="手机号或邮箱"
              />
            </Field>
            <Field label="反馈内容" required>
              <textarea
                className="manual-feedback-textarea"
                rows={8}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="描述遇到的问题、操作步骤和预期结果"
                maxLength={2000}
              />
            </Field>
            <div className="field attachment-field">
              <span className="field-label">
                图片附件
                <small>
                  {attachments.length} / {MAX_IMAGE_COUNT}
                </small>
              </span>
              <input
                ref={imageInputRef}
                className="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="选择图片附件"
                onChange={(event) => {
                  if (event.target.files) addImages(event.target.files);
                  event.target.value = "";
                }}
              />
              <div
                className={`attachment-picker ${draggingImages ? "is-dragging" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    imageInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDraggingImages(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingImages(true);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) {
                    setDraggingImages(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingImages(false);
                  addImages(event.dataTransfer.files);
                }}
              >
                <span className="attachment-picker-icon">
                  <ImagePlus size={20} />
                </span>
                <span className="attachment-picker-copy">
                  <strong>添加问题截图</strong>
                  <small>JPG、PNG、WebP，上传前自动压缩到 5MB 内</small>
                </span>
                <Button
                  type="button"
                  disabled={attachments.length >= MAX_IMAGE_COUNT}
                >
                  <UploadCloud size={16} />
                  选择图片
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="attachment-grid" aria-live="polite">
                  {attachments.map((item) => (
                    <div
                      className={`attachment-card attachment-${item.status}`}
                      key={item.key}
                    >
                      <img src={item.previewUrl} alt={item.name} />
                      <div className="attachment-status">
                        {item.status === "uploading" && (
                          <>
                            <LoaderCircle className="spin" size={13} />
                            上传中
                          </>
                        )}
                        {item.status === "uploaded" && (
                          <>
                            <CheckCircle2 size={13} />
                            已就绪
                          </>
                        )}
                        {item.status === "error" && (
                          <>
                            <CircleAlert size={13} />
                            上传失败
                          </>
                        )}
                      </div>
                      <IconButton
                        label={`移除 ${item.name}`}
                        className="attachment-remove"
                        disabled={item.status === "uploading"}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeImage(item.key);
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                      <div className="attachment-name" title={item.name}>
                        {item.name}
                      </div>
                      {item.status === "error" && (
                        <div className="attachment-error">
                          <span>{item.error}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              retryImage(item.key);
                            }}
                          >
                            重试
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="manual-submit-row">
            <span>
              {hasUploadingImages
                ? "图片上传完成后即可提交。"
                : `提交后会自动获取一次性校验码${uploadedAttachmentIds.length > 0 ? `，并绑定 ${uploadedAttachmentIds.length} 张图片` : ""}。`}
            </span>
            <Button
              tone="primary"
              onClick={() => void submit(false)}
              disabled={
                Boolean(busyAction) ||
                Boolean(parsedExtra.error) ||
                hasUploadingImages ||
                hasImageErrors
              }
            >
              {busyAction === "submit" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              提交测试反馈
            </Button>
          </div>

          <details className="advanced-options">
            <summary>
              <span>
                <KeyRound size={15} />
                高级参数与接口联调
              </span>
            </summary>
            <div className="advanced-body">
              <div className="form-grid">
                <Field label="Client ID">
                  <div className="input-action">
                    <input
                      value={clientId}
                      onChange={(event) => setClientId(event.target.value)}
                      disabled={attachments.length > 0}
                    />
                    <Button
                      type="button"
                      disabled={attachments.length > 0}
                      onClick={() => setClientId(randomId("admin-debug"))}
                    >
                      <RefreshCw size={15} />
                    </Button>
                  </div>
                </Field>
                <Field label="Request ID">
                  <div className="input-action">
                    <input
                      value={requestId}
                      onChange={(event) => setRequestId(event.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => setRequestId(randomId("manual"))}
                    >
                      <RefreshCw size={15} />
                    </Button>
                  </div>
                </Field>
                <Field
                  label="Extra JSON"
                  hint={
                    parsedExtra.error ||
                    "必须是 JSON 对象，后端会补齐 app_name。"
                  }
                >
                  <textarea
                    rows={5}
                    className="code-input"
                    value={extraText}
                    onChange={(event) => setExtraText(event.target.value)}
                    spellCheck={false}
                  />
                </Field>
              </div>
              <div className="debug-actions">
                <Button
                  onClick={() => void onlyIssueCode()}
                  disabled={Boolean(busyAction) || Boolean(parsedExtra.error)}
                >
                  {busyAction === "code" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  只取校验码
                </Button>
                <Button
                  onClick={() => void submit(true)}
                  disabled={
                    !lastCode ||
                    Boolean(busyAction) ||
                    Boolean(parsedExtra.error)
                  }
                >
                  {busyAction === "replay" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Code2 size={16} />
                  )}
                  重放当前码
                </Button>
              </div>
            </div>
          </details>
        </section>

        <aside className="debug-result-column">
          <section className="work-panel result-panel">
            <div className="panel-heading">
              <div>
                <h2>提交结果</h2>
                <p>最近一次测试</p>
              </div>
              {feedbackNo ? (
                <Badge tone="success">提交成功</Badge>
              ) : error ? (
                <Badge tone="danger">提交失败</Badge>
              ) : (
                <Badge>等待提交</Badge>
              )}
            </div>

            {error && (
              <div className="result-notice result-error">
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="result-notice result-success">
                <CheckCircle2 size={18} />
                <span>{message}</span>
              </div>
            )}
            {!error && !message && (
              <div className="result-placeholder">
                <DatabaseZap size={24} />
                <span>填写左侧内容后点击“提交测试反馈”。</span>
              </div>
            )}

            {feedbackNo && (
              <div className="result-block">
                <span className="result-label">Feedback No</span>
                <div className="copy-row">
                  <code>{feedbackNo}</code>
                  <Button onClick={() => void copy(feedbackNo, "反馈编号")}>
                    <Clipboard size={15} />
                  </Button>
                </div>
                <Button tone="primary" onClick={onGoFeedbacks}>
                  查看反馈
                  <ArrowRight size={16} />
                </Button>
                {uploadedAttachmentIds.length > 0 && (
                  <p className="result-attachments">
                    已绑定 {uploadedAttachmentIds.length} 张图片 · Attachment ID{" "}
                    {uploadedAttachmentIds.join(", ")}
                  </p>
                )}
              </div>
            )}

            {lastCode && (
              <details className="advanced-options side-details">
                <summary>
                  <span>
                    <Code2 size={15} />
                    查看接口返回
                  </span>
                </summary>
                <div className="advanced-body">
                  <div className="code-facts">
                    <div>
                      <span>Center</span>
                      <code>{lastCode.centerId}</code>
                    </div>
                    <div>
                      <span>SN</span>
                      <code>{lastCode.sn}</code>
                    </div>
                    <div>
                      <span>Expire</span>
                      <code>{formatDateTime(lastCode.expireAt)}</code>
                    </div>
                  </div>
                  <pre className="json-block compact">
                    {compactJSON({
                      nonce: lastCode.nonce,
                      code: lastCode.code,
                      timestamp: lastCode.timestamp,
                    })}
                  </pre>
                </div>
              </details>
            )}
          </section>

          <section className="work-panel test-context">
            <div className="panel-heading">
              <div>
                <h2>当前配置</h2>
                <p>本次提交使用的反馈中心</p>
              </div>
            </div>
            <dl className="summary-list">
              <div>
                <dt>中心</dt>
                <dd>{center?.name || "—"}</dd>
              </div>
              <div>
                <dt>应用</dt>
                <dd>{center?.appId || "—"}</dd>
              </div>
              <div>
                <dt>环境</dt>
                <dd>{center?.env || "—"}</dd>
              </div>
              <div>
                <dt>渠道</dt>
                <dd>{sn || "—"}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
