import {
  Activity,
  Clipboard,
  Code2,
  Edit3,
  History,
  LoaderCircle,
  Power,
  PowerOff,
  RefreshCcw,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { FeedbackAdminApi } from "../api";
import { ApiError } from "../api";
import { actionLabel, compactJSON, formatDateTime } from "../format";
import type {
  AuditItem,
  FeedbackCenterDetail,
  GeneratedCode,
  GenerateCodeInput,
} from "../types";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  LoadingBlock,
  Modal,
  SecretDialog,
  type ToastMessage,
} from "./Ui";

export function CenterDrawer({
  api,
  centerId,
  notify,
  onClose,
  onEdit,
  onChanged,
}: {
  api: FeedbackAdminApi;
  centerId: string;
  notify: (toast: ToastMessage) => void;
  onClose: () => void;
  onEdit: (center: FeedbackCenterDetail) => void;
  onChanged: () => void;
}) {
  const [center, setCenter] = useState<FeedbackCenterDetail | null>(null);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "status" | "reset" | null
  >(null);
  const [secret, setSecret] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, auditResult] = await Promise.all([
        api.getCenter(centerId),
        api.listAudits(centerId, 1, 20),
      ]);
      setCenter(detail);
      setAudits(auditResult.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载中心失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api, centerId]);

  const changeStatus = async () => {
    if (!center) return;
    setActionBusy(true);
    try {
      const status = center.status === "enabled" ? "disabled" : "enabled";
      await api.setCenterStatus(center.centerId, status);
      notify({
        kind: "success",
        text: status === "enabled" ? "反馈中心已启用" : "反馈中心已禁用",
      });
      setConfirmAction(null);
      onChanged();
      await load();
    } catch (actionError) {
      notify({
        kind: "error",
        text: actionError instanceof Error ? actionError.message : "操作失败",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const resetSecret = async () => {
    if (!center) return;
    setActionBusy(true);
    try {
      const result = await api.resetCenterSecret(center.centerId);
      setSecret(result.secret);
      setConfirmAction(null);
      notify({ kind: "success", text: "密钥已重置，旧校验码立即失效" });
      onChanged();
      await load();
    } catch (actionError) {
      notify({
        kind: "error",
        text: actionError instanceof Error ? actionError.message : "重置失败",
      });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <>
      <button
        className="drawer-scrim"
        type="button"
        aria-label="关闭中心详情"
        onClick={onClose}
      />
      <aside className="drawer center-drawer" aria-label="反馈中心详情">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">Feedback center</span>
            <h2>{center?.name || centerId}</h2>
          </div>
          <IconButton label="关闭详情" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </header>

        <div className="drawer-body">
          {loading ? (
            <LoadingBlock label="正在读取反馈中心" />
          ) : error ? (
            <div className="inline-error">{error}</div>
          ) : center ? (
            <>
              <div className="center-title-row">
                <Badge tone={center.status === "enabled" ? "success" : "warning"}>
                  {center.status === "enabled" ? "已启用" : "已禁用"}
                </Badge>
                <code>{center.centerId}</code>
              </div>

              <div className="center-facts">
                <div>
                  <span>应用</span>
                  <strong>{center.appId}</strong>
                </div>
                <div>
                  <span>环境</span>
                  <strong>{center.env}</strong>
                </div>
                <div>
                  <span>SN 模式</span>
                  <strong>{center.snMode}</strong>
                </div>
                <div>
                  <span>密钥版本</span>
                  <strong>v{center.secretVersion}</strong>
                </div>
                <div>
                  <span>创建人</span>
                  <strong>{center.createdBy || "—"}</strong>
                </div>
                <div>
                  <span>最近调用</span>
                  <strong>{formatDateTime(center.lastUsedAt)}</strong>
                </div>
              </div>

              <section className="detail-section">
                <div className="section-title">
                  <Tag size={16} />
                  <h3>允许的 SN</h3>
                </div>
                {center.snMode === "any" ? (
                  <p className="muted-copy">当前中心接受任意合法 SN。</p>
                ) : center.snList.length ? (
                  <div className="tag-list">
                    {center.snList.map((sn) => (
                      <code key={sn}>{sn}</code>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">未配置 SN。</p>
                )}
              </section>

              <section className="detail-meta-grid">
                <div>
                  <span>到期时间</span>
                  <strong>{formatDateTime(center.expireAt)}</strong>
                </div>
                <div>
                  <span>创建时间</span>
                  <strong>{formatDateTime(center.createdAt)}</strong>
                </div>
                <div>
                  <span>联系人</span>
                  <strong>{center.contact || "—"}</strong>
                </div>
                <div>
                  <span>更新于</span>
                  <strong>{formatDateTime(center.updatedAt)}</strong>
                </div>
              </section>

              {center.remark && (
                <section className="detail-section">
                  <div className="section-title">
                    <ShieldCheck size={16} />
                    <h3>备注</h3>
                  </div>
                  <p className="muted-copy">{center.remark}</p>
                </section>
              )}

              <section className="detail-section">
                <div className="section-title">
                  <History size={16} />
                  <h3>操作记录</h3>
                  <Badge>{audits.length}</Badge>
                </div>
                {audits.length === 0 ? (
                  <EmptyState
                    icon={<Activity size={22} />}
                    title="暂无操作记录"
                    description="中心的创建、启停和密钥操作会记录在这里。"
                  />
                ) : (
                  <div className="audit-list">
                    {audits.map((audit) => (
                      <div className="audit-item" key={audit.id}>
                        <span className="audit-dot" />
                        <div>
                          <strong>{actionLabel(audit.action)}</strong>
                          <span>
                            {audit.operator || "admin"} ·{" "}
                            {formatDateTime(audit.createdAt)}
                          </span>
                          {audit.detail &&
                            Object.keys(audit.detail).length > 0 && (
                              <code>{compactJSON(audit.detail)}</code>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {center && (
          <footer className="drawer-footer center-actions">
            <Button onClick={() => onEdit(center)}>
              <Edit3 size={16} />
              编辑
            </Button>
            <Button onClick={() => setCodeOpen(true)}>
              <Code2 size={16} />
              测试码
            </Button>
            <Button onClick={() => setConfirmAction("reset")}>
              <RefreshCcw size={16} />
              重置密钥
            </Button>
            <Button
              tone={center.status === "enabled" ? "secondary" : "primary"}
              onClick={() => setConfirmAction("status")}
            >
              {center.status === "enabled" ? (
                <PowerOff size={16} />
              ) : (
                <Power size={16} />
              )}
              {center.status === "enabled" ? "禁用" : "启用"}
            </Button>
          </footer>
        )}
      </aside>

      <ConfirmDialog
        open={confirmAction === "status"}
        title={center?.status === "enabled" ? "禁用反馈中心" : "启用反馈中心"}
        description={
          center?.status === "enabled"
            ? "禁用后该中心的所有取码与提交都会立即被拒绝。"
            : "启用后客户端可以重新获取校验码并提交反馈。"
        }
        confirmLabel={center?.status === "enabled" ? "确认禁用" : "确认启用"}
        danger={center?.status === "enabled"}
        busy={actionBusy}
        onConfirm={changeStatus}
        onClose={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "reset"}
        title="重置反馈中心密钥"
        description="旧密钥签发的校验码会立即失效，所有客户端都需要重新取码。"
        confirmLabel="确认重置"
        danger
        busy={actionBusy}
        onConfirm={resetSecret}
        onClose={() => setConfirmAction(null)}
      />
      <SecretDialog
        open={Boolean(secret)}
        title="新密钥已生成"
        secret={secret}
        centerId={centerId}
        onClose={() => setSecret("")}
      />
      {center && (
        <GenerateCodeDialog
          open={codeOpen}
          api={api}
          center={center}
          onClose={() => setCodeOpen(false)}
          onGenerated={() => notify({ kind: "success", text: "测试校验码已生成" })}
        />
      )}
    </>
  );
}

function GenerateCodeDialog({
  open,
  api,
  center,
  onClose,
  onGenerated,
}: {
  open: boolean;
  api: FeedbackAdminApi;
  center: FeedbackCenterDetail;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [sn, setSn] = useState(center.snList[0] ?? "");
  const [timestamp, setTimestamp] = useState(String(Math.floor(Date.now() / 1000)));
  const [nonce, setNonce] = useState("");
  const [ttl, setTtl] = useState("300");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GeneratedCode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSn(center.snList[0] ?? "");
    setTimestamp(String(Math.floor(Date.now() / 1000)));
    setNonce("");
    setTtl("300");
    setResult(null);
    setError("");
  }, [center.snList, open]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input: GenerateCodeInput = {
        sn: sn.trim(),
        timestamp: Number(timestamp),
        ttl: Number(ttl),
      };
      if (nonce.trim()) input.nonce = nonce.trim();
      setResult(await api.generateCode(center.centerId, input));
      onGenerated();
    } catch (generateError) {
      setError(
        generateError instanceof ApiError
          ? generateError.message
          : "生成校验码失败",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (result) await navigator.clipboard.writeText(result.code);
  };

  return (
    <Modal
      open={open}
      title="生成测试校验码"
      description="由管理端直接签发，用于检查中心配置和 Redis 状态。"
      onClose={onClose}
      wide
    >
      <form className="form-grid" onSubmit={generate}>
        <Field label="SN" required>
          {center.snMode === "any" ? (
            <input
              value={sn}
              onChange={(event) => setSn(event.target.value)}
              placeholder="lumaris-prod"
            />
          ) : (
            <select
              value={sn}
              onChange={(event) => setSn(event.target.value)}
              required
            >
              <option value="">选择 SN</option>
              {center.snList.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Timestamp">
          <input
            type="number"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
          />
        </Field>
        <Field label="Nonce" hint="留空由后端生成。">
          <input
            value={nonce}
            onChange={(event) => setNonce(event.target.value)}
            placeholder="自动生成"
          />
        </Field>
        <Field label="TTL（秒）">
          <input
            type="number"
            min={1}
            max={3600}
            value={ttl}
            onChange={(event) => setTtl(event.target.value)}
          />
        </Field>

        {result && (
          <div className="generated-code">
            <div className="split-heading">
              <strong>校验码</strong>
              <IconButton label="复制校验码" onClick={copyCode}>
                <Clipboard size={16} />
              </IconButton>
            </div>
            <code>{result.code}</code>
            <div className="generated-meta">
              <span>timestamp {result.timestamp}</span>
              <span>nonce {result.nonce}</span>
              <span>到期 {formatDateTime(result.expireAt)}</span>
            </div>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions form-actions">
          <Button type="button" onClick={onClose}>
            关闭
          </Button>
          <Button tone="primary" type="submit" disabled={busy || !sn.trim()}>
            {busy && <LoaderCircle className="spin" size={16} />}
            生成
          </Button>
        </div>
      </form>
    </Modal>
  );
}
