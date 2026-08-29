import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { listFeedbacks } from '../api/feedback'
import type { FeedbackListItem } from '../types'
import FeedbackDetailDrawer from '../components/FeedbackDetailDrawer'

const { RangePicker } = DatePicker

const APP_OPTIONS = [
  { value: 'lumaris', label: '光序 lumaris' },
  { value: 'lumalis', label: '光汇 lumalis' },
]

function extraAppName(extra: FeedbackListItem['extra']): string {
  const v = extra as { app_name?: unknown } | null | undefined
  return typeof v?.app_name === 'string' ? v.app_name : ''
}

export default function FeedbackListPage({
  onLogout,
}: {
  onLogout: () => void
}) {
  const [items, setItems] = useState<FeedbackListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(2)

  const [contact, setContact] = useState('')
  const [appName, setAppName] = useState<string | undefined>(undefined)
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const [selectedNo, setSelectedNo] = useState<string | null>(null)

  const load = useCallback(
    async (p: number, ps: number) => {
      setLoading(true)
      try {
        const d = await listFeedbacks({
          page: p,
          page_size: ps,
          contact: contact || undefined,
          app_name: appName,
          start_date: range?.[0]?.startOf('day')?.toISOString(),
          end_date: range?.[1]?.endOf('day')?.toISOString(),
        })
        setItems(d.items ?? [])
        setTotal(d.total)
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    },
    [contact, appName, range],
  )

  useEffect(() => {
    load(page, pageSize)
  }, [page, pageSize, load])

  const columns: ColumnsType<FeedbackListItem> = [
    {
      title: '编号',
      dataIndex: 'feedback_no',
      width: 190,
      ellipsis: true,
      render: (v: string) => (
        <a style={{ fontFamily: 'monospace' }}>{v}</a>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      width: 160,
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: '产品线',
      key: 'app_name',
      width: 140,
      render: (_, r) => {
        const a = extraAppName(r.extra)
        return a ? (
          <Tag color={a === 'lumaris' ? 'blue' : 'geekblue'}>{a}</Tag>
        ) : (
          '-'
        )
      },
    },
    {
      title: '图片',
      dataIndex: 'image_count',
      width: 80,
      render: (v: number) => (v > 0 ? `${v} 张` : '-'),
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Card>
        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Input.Search
            placeholder="联系方式（模糊搜索）"
            allowClear
            style={{ width: 220 }}
            onSearch={(v) => {
              setContact(v)
              setPage(1)
            }}
          />
          <Select
            placeholder="产品线"
            allowClear
            style={{ width: 170 }}
            options={APP_OPTIONS}
            value={appName}
            onChange={(v) => {
              setAppName(v)
              setPage(1)
            }}
          />
          <RangePicker
            onChange={(dates) => {
              setRange(dates)
              setPage(1)
            }}
          />
          <Button type="text" danger onClick={onLogout}>
            退出登录
          </Button>
        </Space>

        <Table
          rowKey="feedback_no"
          columns={columns}
          dataSource={items}
          loading={loading}
          onRow={(r) => ({
            onClick: () => setSelectedNo(r.feedback_no),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [2, 5, 10, 20],
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <FeedbackDetailDrawer
        feedbackNo={selectedNo}
        open={selectedNo !== null}
        onClose={() => setSelectedNo(null)}
      />
    </div>
  )
}
