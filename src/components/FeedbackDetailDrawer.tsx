import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Spin,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { getFeedback } from '../api/feedback'
import type { FeedbackDetail } from '../types'
import ExpiringImage from './ExpiringImage'

const { Text } = Typography

function extraAppName(extra: FeedbackDetail['extra']): string {
  const v = extra as { app_name?: unknown } | null | undefined
  return typeof v?.app_name === 'string' ? v.app_name : '-'
}

function formatExtra(extra: FeedbackDetail['extra']): string {
  if (!extra) return '{}'
  try {
    return JSON.stringify(extra, null, 2)
  } catch {
    return String(extra)
  }
}

export default function FeedbackDetailDrawer({
  feedbackNo,
  open,
  onClose,
}: {
  feedbackNo: string | null
  open: boolean
  onClose: () => void
}) {
  const [detail, setDetail] = useState<FeedbackDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshingImages, setRefreshingImages] = useState(false)

  const load = useCallback(
    async (refreshImages = false) => {
      if (!feedbackNo) return
      if (refreshImages) setRefreshingImages(true)
      else setLoading(true)
      try {
        setDetail(await getFeedback(feedbackNo))
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载详情失败')
      } finally {
        setLoading(false)
        setRefreshingImages(false)
      }
    },
    [feedbackNo],
  )

  useEffect(() => {
    if (open) {
      setDetail(null)
      load()
    }
  }, [open, load])

  const refreshImages = () => load(true)

  return (
    <Drawer
      title={detail ? `反馈 ${detail.feedback_no}` : '反馈详情'}
      open={open}
      onClose={onClose}
      width={560}
    >
      {loading && !detail ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : detail ? (
        <div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="编号">
              <span style={{ fontFamily: 'monospace' }}>
                {detail.feedback_no}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="联系方式">
              {detail.contact}
            </Descriptions.Item>
            <Descriptions.Item label="产品线">
              {extraAppName(detail.extra)}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              <div style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</div>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 16 }}>
            附件（{detail.images.length}）
          </Typography.Title>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: 8,
              gap: 8,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              图片凭证 15 分钟过期
            </Text>
            <Button
              size="small"
              loading={refreshingImages}
              onClick={refreshImages}
            >
              刷新凭证
            </Button>
          </div>

          {detail.images.length === 0 ? (
            <Empty description="无图片" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {detail.images.map((img) => (
                <ExpiringImage
                  key={img.attachment_id}
                  image={img}
                  onRefresh={refreshImages}
                />
              ))}
            </div>
          )}

          <Typography.Title level={5} style={{ marginTop: 16 }}>
            extra
          </Typography.Title>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              overflow: 'auto',
              maxHeight: 240,
              fontSize: 12,
            }}
          >
            {formatExtra(detail.extra)}
          </pre>
        </div>
      ) : null}
    </Drawer>
  )
}
