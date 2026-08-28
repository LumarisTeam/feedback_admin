import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { clearToken, setToken } from '../auth'
import { listFeedbacks } from '../api/feedback'

const { Title, Text } = Typography

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { token: string }) => {
    const token = values.token.trim()
    if (!token) return

    setToken(token)
    setLoading(true)
    try {
      // 用最小分页请求校验 token 是否有效
      await listFeedbacks({ page: 1, page_size: 1 })
      message.success('登录成功')
      onSuccess()
    } catch (e) {
      clearToken()
      message.error(e instanceof Error ? e.message : 'Token 校验失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Card style={{ width: 380 }}>
        <Title level={4} style={{ marginTop: 0 }}>
          统一反馈中心 · 管理端
        </Title>
        <Text type="secondary">请输入管理员 Token 登录</Text>
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item
            name="token"
            rules={[{ required: true, message: '请输入 Token' }]}
          >
            <Input.Password placeholder="ADMIN_API_TOKEN" autoFocus />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
