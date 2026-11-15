import {
  CheckCircle2,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { prepareImage } from "../image";
import { Button, IconButton, type ToastMessage } from "./Ui";

export interface AttachmentDraft {
  key: string;
  file: File;
  name: string;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  attachmentId?: number;
  error?: string;
}

function randomId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useImageAttachments({
  upload,
  notify,
  maxCount = 6,
}: {
  upload: (file: Blob, filename: string) => Promise<number>;
  notify: (toast: ToastMessage) => void;
  maxCount?: number;
}) {
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const previewUrls = useRef(new Set<string>());
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const releasePreview = (url: string) => {
    URL.revokeObjectURL(url);
    previewUrls.current.delete(url);
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
      const attachmentId = await uploadRef.current(
        prepared.blob,
        prepared.filename,
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
    } catch (error) {
      setAttachments((current) =>
        current.map((item) =>
          item.key === draft.key
            ? {
                ...item,
                status: "error",
                error: error instanceof Error ? error.message : "图片上传失败",
              }
            : item,
        ),
      );
    }
  };

  const addImages = (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    const room = maxCount - attachments.length;
    if (room <= 0) {
      notify({ kind: "error", text: `最多添加 ${maxCount} 张图片` });
      return;
    }
    if (selected.length > room) {
      notify({
        kind: "info",
        text: `最多 ${maxCount} 张，本次只加入前 ${room} 张`,
      });
    }
    const drafts = selected.slice(0, room).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return {
        key: randomId("attachment"),
        file,
        name: file.name,
        previewUrl,
        status: "uploading" as const,
      };
    });
    setAttachments((current) => [...current, ...drafts]);
    drafts.forEach((draft) => void uploadAttachment(draft));
  };

  const removeImage = (key: string) => {
    const target = attachments.find((item) => item.key === key);
    if (target) releasePreview(target.previewUrl);
    setAttachments((current) => current.filter((item) => item.key !== key));
  };

  const retryImage = (key: string) => {
    const target = attachments.find((item) => item.key === key);
    if (target) void uploadAttachment(target);
  };

  const reset = () => {
    attachments.forEach((item) => releasePreview(item.previewUrl));
    setAttachments([]);
  };

  const uploading = attachments.some((item) => item.status === "uploading");
  const hasErrors = attachments.some((item) => item.status === "error");
  const attachmentIds = attachments
    .filter(
      (item): item is AttachmentDraft & { attachmentId: number } =>
        item.status === "uploaded" && item.attachmentId !== undefined,
    )
    .map((item) => item.attachmentId);

  return {
    attachments,
    addImages,
    removeImage,
    retryImage,
    reset,
    uploading,
    hasErrors,
    attachmentIds,
  };
}

export type ImageAttachmentControl = ReturnType<typeof useImageAttachments>;

export function ImageAttachmentField({
  control,
  maxCount = 6,
}: {
  control: ImageAttachmentControl;
  maxCount?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="field attachment-field">
      <span className="field-label">
        图片附件
        <small>
          {control.attachments.length} / {maxCount}
        </small>
      </span>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="选择图片附件"
        onChange={(event) => {
          if (event.target.files) control.addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <div
        className={`attachment-picker ${dragging ? "is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          control.addImages(event.dataTransfer.files);
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
          disabled={control.attachments.length >= maxCount}
        >
          <UploadCloud size={16} />
          选择图片
        </Button>
      </div>
      {control.attachments.length > 0 && (
        <div className="attachment-grid" aria-live="polite">
          {control.attachments.map((item) => (
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
                  control.removeImage(item.key);
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
                      control.retryImage(item.key);
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
  );
}
