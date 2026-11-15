export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface ListResponse<T> {
  total: number;
  items: T[];
}

export interface FeedbackItem {
  feedback_no: string;
  client_id: string;
  content: string;
  contact: string;
  image_count: number;
  extra: Record<string, unknown> | null;
  created_at: string;
}

export interface FeedbackImage {
  attachment_id: number;
  file_key: string;
  url: string;
  expires_at: string;
  mime_type: string;
  size: number;
}

export interface FeedbackDetail {
  feedback_no: string;
  content: string;
  contact: string;
  image_count: number;
  extra: Record<string, unknown> | null;
  created_at: string;
  images: FeedbackImage[];
}

export interface FeedbackFilters {
  contact: string;
  appName: string;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
}

export type CenterStatus = "enabled" | "disabled";
export type SNMode = "whitelist" | "prefix" | "any";

export interface FeedbackCenterListItem {
  centerId: string;
  name: string;
  appId: string;
  env: string;
  snMode: SNMode;
  status: CenterStatus;
  secretVersion: number;
  expireAt?: string;
  contact: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackCenterDetail {
  centerId: string;
  name: string;
  appId: string;
  env: string;
  secretMasked: string;
  secretVersion: number;
  snMode: SNMode;
  status: CenterStatus;
  snList: string[];
  expireAt?: string;
  contact: string;
  remark: string;
  createdBy: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CenterFilters {
  keyword: string;
  status: "" | CenterStatus;
  page: number;
  pageSize: number;
}

export interface CenterInput {
  name: string;
  appId: string;
  env: string;
  snMode: SNMode;
  snList: string[];
  expireAt?: string;
  contact: string;
  remark: string;
}

export interface CreateCenterResult {
  centerId: string;
  secret: string;
  status: CenterStatus;
}

export interface ResetSecretResult {
  centerId: string;
  secret: string;
  secretVersion: number;
}

export interface GeneratedCode {
  centerId: string;
  timestamp: number;
  sn: string;
  nonce: string;
  code: string;
  expireAt: string;
}

export interface PresignUploadResult {
  file_key: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  expires_at: string;
}

export interface GenerateCodeInput {
  timestamp?: number;
  sn: string;
  nonce?: string;
  ttl?: number;
}

export interface AuditItem {
  id: number;
  centerId: string;
  action: string;
  operator: string;
  detail: Record<string, unknown> | null;
  ip: string;
  createdAt: string;
}

export interface DebugSubmission {
  request_id: string;
  content: string;
  contact: string;
  attachment_ids: number[];
  extra: Record<string, unknown>;
}
