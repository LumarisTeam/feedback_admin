// 后端统一响应信封：{ code: 0, message: 'ok', data: ... }
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

// 列表项（后端 GET /api/v1/admin/feedbacks 返回的 items[]）
export interface FeedbackListItem {
  feedback_no: string
  client_id: string
  content: string
  contact: string
  image_count: number
  extra: Record<string, unknown> | null
  created_at: string
}

export interface FeedbackListData {
  total: number
  items: FeedbackListItem[]
}

// 详情里的单张图片（含 15 分钟临时签名 URL）
export interface FeedbackImage {
  attachment_id: number
  file_key: string
  url: string
  expires_at: string
  mime_type: string
  size: number
}

export interface FeedbackDetail {
  feedback_no: string
  content: string
  contact: string
  image_count: number
  extra: Record<string, unknown> | null
  created_at: string
  images: FeedbackImage[]
}

// 列表查询参数
export interface ListParams {
  page: number
  page_size: number
  contact?: string
  app_name?: string
  start_date?: string
  end_date?: string
}
