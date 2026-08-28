import { useEffect, useState } from 'react'
import { Button } from 'antd'
import type { FeedbackImage } from '../types'

/**
 * 单张反馈图片：签名 URL 15 分钟过期。
 * 加载失败（403）时显示「凭证已过期」占位 + 刷新按钮，点击重新获取详情拿新 URL。
 */
export default function ExpiringImage({
  image,
  onRefresh,
}: {
  image: FeedbackImage
  onRefresh: () => void
}) {
  const [expired, setExpired] = useState(false)

  // 拿到新 URL（父级刷新详情后）时重置过期状态
  useEffect(() => {
    setExpired(false)
  }, [image.url])

  if (expired) {
    return (
      <div
        style={{
          height: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
        }}
      >
        <span style={{ color: '#999', fontSize: 12 }}>图片凭证已过期</span>
        <Button size="small" onClick={onRefresh}>
          刷新
        </Button>
      </div>
    )
  }

  return (
    <a href={image.url} target="_blank" rel="noreferrer" title="点击查看原图">
      <img
        src={image.url}
        alt={image.file_key}
        onError={() => setExpired(true)}
        style={{
          width: '100%',
          height: 160,
          objectFit: 'contain',
          background: '#f0f0f0',
          borderRadius: 8,
          display: 'block',
        }}
      />
    </a>
  )
}
