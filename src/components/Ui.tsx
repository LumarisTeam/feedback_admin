import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  children,
  tone = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
}) {
  return (
    <button className={`button button-${tone} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-layer" role="presentation">
      <button
        className="modal-scrim"
        aria-label="关闭"
        onClick={onClose}
        type="button"
      />
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="modal-actions">
        <Button onClick={onClose} disabled={busy}>
          取消
        </Button>
        <Button
          tone={danger ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy && <LoaderCircle className="spin" size={16} />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function SecretDialog({
  open,
  title,
  secret,
  centerId,
  onClose,
}: {
  open: boolean;
  title: string;
  secret: string;
  centerId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  };

  return (
    <Modal
      open={open}
      title={title}
      description="密钥只展示这一次，关闭后无法再次查看。"
      onClose={onClose}
    >
      <div className="secret-block">
        <div className="field">
          <span className="field-label">Center ID</span>
          <code>{centerId}</code>
        </div>
        <div className="field">
          <span className="field-label">Secret</span>
          <div className="secret-value">
            <code>{secret}</code>
            <IconButton label="复制密钥" onClick={copySecret}>
              {copied ? <Check size={17} /> : <Clipboard size={17} />}
            </IconButton>
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <Button tone="primary" onClick={onClose}>
          我已保存
        </Button>
      </div>
    </Modal>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        共 {total} 条 · 第 {page} / {pages} 页
      </span>
      <div className="pagination-actions">
        <IconButton
          label="上一页"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </IconButton>
        <IconButton
          label="下一页"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </IconButton>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingBlock({ label = "正在加载" }: { label?: string }) {
  return (
    <div className="loading-block">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}

export interface ToastMessage {
  kind: "success" | "error" | "info";
  text: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timeout);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <span>{toast.text}</span>
      <IconButton label="关闭提示" onClick={onDismiss}>
        <X size={15} />
      </IconButton>
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em>*</em>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
