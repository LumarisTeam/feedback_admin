import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button as BaseButton } from "./ui/button";
import { cn } from "@/lib/utils";

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function Button({ children, tone = "secondary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  const variants = { primary: "default", secondary: "secondary", danger: "destructive", ghost: "ghost" } as const;
  return <BaseButton variant={variants[tone]} className={cn("button", className)} {...props}>{children}</BaseButton>;
}

export function IconButton({ label, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <BaseButton variant="ghost" size="icon" className={className} type="button" title={label} aria-label={label} {...props}>{children}</BaseButton>;
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
  children: ReactNode;
}) {
  const colors = { success: "border-emerald-200 bg-emerald-50 text-emerald-700", warning: "border-amber-200 bg-amber-50 text-amber-700", danger: "border-red-200 bg-red-50 text-red-700", neutral: "border-border bg-muted text-foreground", info: "border-blue-200 bg-blue-50 text-blue-700" };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", colors[tone])}>{children}</span>;
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
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
        <Dialog.Content className={cn("fixed left-1/2 top-1/2 z-[80] max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg focus:outline-none", wide ? "max-w-2xl" : "max-w-lg")}>
          <header className="flex items-start justify-between gap-4 pb-4">
            <div><Dialog.Title className="text-lg font-semibold leading-none tracking-tight">{title}</Dialog.Title>{description && <Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description>}</div>
            <Dialog.Close asChild><IconButton label="关闭"><X size={18} /></IconButton></Dialog.Close>
          </header>
          {!description && <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg focus:outline-none">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild><Button disabled={busy}>取消</Button></AlertDialog.Cancel>
            <Button tone={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />}{confirmLabel}</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
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
    <div className={cn("fixed bottom-6 right-6 z-[100] flex max-w-sm items-center gap-3 rounded-lg border bg-background p-4 text-sm text-foreground shadow-lg", toast.kind === "error" && "border-red-300 text-red-700")} role="status">
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
