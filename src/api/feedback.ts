import { api } from './client'
import type { FeedbackDetail, FeedbackListData, ListParams } from '../types'

export function listFeedbacks(params: ListParams): Promise<FeedbackListData> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('page_size', String(params.page_size))
  if (params.contact) qs.set('contact', params.contact)
  if (params.app_name) qs.set('app_name', params.app_name)
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date) qs.set('end_date', params.end_date)
  return api.get(`/api/v1/admin/feedbacks?${qs.toString()}`)
}

export function getFeedback(feedbackNo: string): Promise<FeedbackDetail> {
  return api.get(`/api/v1/admin/feedbacks/${encodeURIComponent(feedbackNo)}`)
}
