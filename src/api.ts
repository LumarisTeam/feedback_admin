import type {
  ApiEnvelope,
  AuditItem,
  CenterFilters,
  CenterInput,
  CenterStatus,
  CreateCenterResult,
  DebugSubmission,
  FeedbackCenterDetail,
  FeedbackCenterListItem,
  FeedbackDetail,
  FeedbackFilters,
  FeedbackItem,
  GenerateCodeInput,
  GeneratedCode,
  ListResponse,
  PresignUploadResult,
  ResetSecretResult,
} from "./types";

export class ApiError extends Error {
  status: number;
  code: number;

  constructor(message: string, status = 0, code = -1) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function trimBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export class FeedbackAdminApi {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly operator: string;

  constructor(baseUrl: string, token: string, operator: string) {
    this.baseUrl = trimBaseUrl(baseUrl);
    this.token = token;
    this.operator = operator;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    admin = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (admin) {
      headers.set("Authorization", `Bearer ${this.token}`);
      headers.set("X-Operator", this.operator || "admin");
      headers.set("X-Admin-Role", "admin");
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("无法连接后端，请检查服务地址和服务状态");
    }

    let body: ApiEnvelope<T> | null = null;
    try {
      body = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(`后端返回了无法解析的响应（HTTP ${response.status}）`, response.status);
    }

    if (!response.ok || body.code !== 0) {
      throw new ApiError(
        body.message || `请求失败（HTTP ${response.status}）`,
        response.status,
        body.code,
      );
    }
    return body.data;
  }

  listFeedbacks(filters: FeedbackFilters) {
    return this.request<ListResponse<FeedbackItem>>(
      `/api/v1/admin/feedbacks${buildQuery({
        page: filters.page,
        page_size: filters.pageSize,
        contact: filters.contact.trim(),
        app_name: filters.appName.trim(),
        start_date: filters.startDate,
        end_date: filters.endDate,
      })}`,
    );
  }

  getFeedback(feedbackNo: string) {
    return this.request<FeedbackDetail>(
      `/api/v1/admin/feedbacks/${encodeURIComponent(feedbackNo)}`,
    );
  }

  listCenters(filters: CenterFilters) {
    return this.request<ListResponse<FeedbackCenterListItem>>(
      `/api/v1/admin/feedback-centers${buildQuery({
        page: filters.page,
        page_size: filters.pageSize,
        keyword: filters.keyword.trim(),
        status: filters.status,
      })}`,
    );
  }

  getCenter(centerId: string) {
    return this.request<FeedbackCenterDetail>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}`,
    );
  }

  createCenter(input: CenterInput) {
    return this.request<CreateCenterResult>("/api/v1/admin/feedback-centers", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateCenter(centerId: string, input: CenterInput) {
    return this.request<FeedbackCenterDetail>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  }

  setCenterStatus(centerId: string, status: CenterStatus) {
    return this.request<{ status: CenterStatus }>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  }

  resetCenterSecret(centerId: string) {
    return this.request<ResetSecretResult>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}/secret/reset`,
      { method: "POST" },
    );
  }

  generateCode(centerId: string, input: GenerateCodeInput) {
    return this.request<GeneratedCode>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}/codes/generate`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  }

  listAudits(centerId: string, page = 1, pageSize = 20) {
    return this.request<ListResponse<AuditItem>>(
      `/api/v1/admin/feedback-centers/${encodeURIComponent(centerId)}/audit-logs${buildQuery({
        page,
        page_size: pageSize,
      })}`,
    );
  }

  issueClientCode(centerId: string, sn: string, clientId: string) {
    return this.request<GeneratedCode>(
      `/api/v1/feedback-centers/${encodeURIComponent(centerId)}/codes`,
      {
        method: "POST",
        headers: { "X-Client-ID": clientId },
        body: JSON.stringify({ sn }),
      },
      false,
    );
  }

  submitDebugFeedback(
    submission: DebugSubmission,
    code: GeneratedCode,
    clientId: string,
  ) {
    return this.request<{ feedback_no: string }>(
      "/api/v1/feedbacks",
      {
        method: "POST",
        headers: {
          "X-Client-ID": clientId,
          "X-Feedback-Center-Id": code.centerId,
          "X-Timestamp": String(code.timestamp),
          "X-SN": code.sn,
          "X-Nonce": code.nonce,
          "X-Code": code.code,
        },
        body: JSON.stringify(submission),
      },
      false,
    );
  }

  async uploadImage(file: Blob, filename: string, clientId: string) {
    const mimeType = file.type;
    let presign = await this.presignImage(
      filename,
      file.size,
      mimeType,
      clientId,
    );

    try {
      await this.putImage(presign, file);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 403) {
        throw error;
      }
      presign = await this.presignImage(
        filename,
        file.size,
        mimeType,
        clientId,
      );
      await this.putImage(presign, file);
    }

    return this.confirmImageWithRetry(presign.file_key, clientId);
  }

  private presignImage(
    filename: string,
    size: number,
    mimeType: string,
    clientId: string,
  ) {
    return this.request<PresignUploadResult>(
      "/api/v1/uploads/presign",
      {
        method: "POST",
        headers: { "X-Client-ID": clientId },
        body: JSON.stringify({
          filename,
          size,
          mime_type: mimeType,
        }),
      },
      false,
    );
  }

  private async putImage(presign: PresignUploadResult, file: Blob) {
    let response: Response;
    try {
      response = await fetch(presign.upload_url, {
        method: presign.method || "PUT",
        headers: presign.headers,
        body: file,
      });
    } catch {
      throw new ApiError(
        "图片上传失败。请确认对象存储桶已配置浏览器跨域访问（CORS）",
      );
    }
    if (!response.ok) {
      throw new ApiError(
        `图片上传到对象存储失败（HTTP ${response.status}）`,
        response.status,
      );
    }
  }

  private async confirmImageWithRetry(fileKey: string, clientId: string) {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await this.request<{ attachment_id: number }>(
          "/api/v1/uploads/confirm",
          {
            method: "POST",
            headers: { "X-Client-ID": clientId },
            body: JSON.stringify({ file_key: fileKey }),
          },
          false,
        );
        return result.attachment_id;
      } catch (error) {
        lastError = error;
        if (
          !(error instanceof ApiError) ||
          (error.status !== 0 && error.status < 500) ||
          attempt === maxAttempts - 1
        ) {
          throw error;
        }
        await new Promise((resolve) =>
          window.setTimeout(resolve, 500 * 2 ** attempt),
        );
      }
    }
    throw lastError;
  }
}
