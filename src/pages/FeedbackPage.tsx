import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Sheet } from "../components/ui/sheet";
import { Input, NativeSelect } from "../components/ui/input";
import {
  CalendarDays,
  ExternalLink,
  FileSearch,
  Filter,
  Image as ImageIcon,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { FeedbackAdminApi } from "../api";
import { ApiError } from "../api";
import { PageHeader } from "../components/AppShell";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  LoadingBlock,
  Pagination,
  type ToastMessage,
} from "../components/Ui";
import {
  compactJSON,
  extraValue,
  formatBytes,
  formatDateTime,
  toRFC3339,
} from "../format";
import type {
  FeedbackDetail,
  FeedbackFilters,
  FeedbackItem,
} from "../types";

const initialFilters: FeedbackFilters = {
  contact: "",
  appName: "",
  startDate: "",
  endDate: "",
  page: 1,
  pageSize: 20,
};

export function FeedbackPage({
  api,
  notify,
  onUnauthorized,
}: {
  api: FeedbackAdminApi;
  notify: (toast: ToastMessage) => void;
  onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState({
    contact: "",
    appName: "",
    startDate: "",
    endDate: "",
  });
  const [filters, setFilters] = useState<FeedbackFilters>(initialFilters);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .listFeedbacks(filters)
      .then((result) => {
        if (!active) return;
        setItems(result.items ?? []);
        setTotal(result.total);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized();
          return;
        }
        notify({
          kind: "error",
          text: error instanceof Error ? error.message : "加载反馈失败",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, filters, notify, onUnauthorized, refreshKey]);

  useEffect(() => {
    if (!selectedNo) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    api
      .getFeedback(selectedNo)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDetailError(error instanceof Error ? error.message : "加载详情失败");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, selectedNo, detailRefreshKey]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters({
      ...initialFilters,
      ...draft,
      pageSize: filters.pageSize,
      startDate: toRFC3339(draft.startDate),
      endDate: toRFC3339(draft.endDate, true),
    });
  };

  const clearFilters = () => {
    setDraft({ contact: "", appName: "", startDate: "", endDate: "" });
    setFilters((value) => ({ ...initialFilters, pageSize: value.pageSize }));
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Feedback inbox"
        title="反馈记录"
        description="检索用户提交内容，查看设备上下文与图片附件。"
        actions={
          <Button onClick={() => setRefreshKey((value) => value + 1)}>
            <RefreshCw size={16} />
            刷新
          </Button>
        }
      />

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-lead">
          <Filter size={16} />
          <span>筛选</span>
        </div>
        <label className="compact-field">
          <span>联系方式</span>
          <div className="input-with-icon">
            <Search size={15} />
            <Input
              value={draft.contact}
              onChange={(event) =>
                setDraft((value) => ({ ...value, contact: event.target.value }))
              }
              placeholder="手机号或邮箱"
            />
          </div>
        </label>
        <label className="compact-field">
          <span>应用</span>
          <NativeSelect
            value={draft.appName}
            onChange={(event) =>
              setDraft((value) => ({ ...value, appName: event.target.value }))
            }
          >
            <option value="">全部应用</option>
            <option value="lumaris">光序 · lumaris</option>
            <option value="lumalis">光汇 · lumalis</option>
          </NativeSelect>
        </label>
        <label className="compact-field">
          <span>起始日期</span>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(event) =>
              setDraft((value) => ({ ...value, startDate: event.target.value }))
            }
          />
        </label>
        <label className="compact-field">
          <span>结束日期</span>
          <Input
            type="date"
            value={draft.endDate}
            onChange={(event) =>
              setDraft((value) => ({ ...value, endDate: event.target.value }))
            }
          />
        </label>
        <div className="filter-actions">
          <Button tone="ghost" type="button" onClick={clearFilters}>
            清空
          </Button>
          <Button tone="primary" type="submit">
            查询
          </Button>
        </div>
      </form>

      <section className="data-panel" aria-label="反馈列表">
        <div className="data-panel-head">
          <div>
            <h2>提交记录</h2>
            <span>{total} 条反馈</span>
          </div>
          {loading && <LoadingBlock label="正在刷新" />}
        </div>

        {!loading && items.length === 0 ? (
          <EmptyState
            icon={<Inbox size={24} />}
            title="没有符合条件的反馈"
            description="调整筛选条件，或在调试提交页生成一条真实反馈。"
          />
        ) : (
          <div className="table-wrap">
            <Table className="data-table feedback-table">
              <TableHeader>
                <TableRow>
                  <TableHead>反馈编号</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>应用 / 页面</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>附件</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead aria-label="操作" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.feedback_no}
                    className="clickable-row"
                    onClick={() => setSelectedNo(item.feedback_no)}
                  >
                    <TableCell>
                      <code className="id-code">{item.feedback_no}</code>
                    </TableCell>
                    <TableCell className="content-cell">
                      <span>{item.content}</span>
                    </TableCell>
                    <TableCell>
                      <div className="stacked-cell">
                        <strong>{extraValue(item.extra, "app_name")}</strong>
                        <span>{extraValue(item.extra, "page")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.contact}</TableCell>
                    <TableCell>
                      <span className="inline-metric">
                        <ImageIcon size={15} />
                        {item.image_count}
                      </span>
                    </TableCell>
                    <TableCell className="nowrap">{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>
                      <IconButton
                        label={`查看反馈 ${item.feedback_no}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNo(item.feedback_no);
                        }}
                      >
                        <ExternalLink size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="feedback-pagination-options">
          <label>
            每页
            <NativeSelect
              value={filters.pageSize}
              onChange={(event) => setFilters((value) => ({
                ...value, page: 1, pageSize: Number(event.target.value),
              }))}
            >
              {[2, 5, 10, 20].map((size) => <option key={size} value={size}>{size}</option>)}
            </NativeSelect>
            条
          </label>
          <form onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const page = Number(data.get("page"));
            if (Number.isInteger(page) && page >= 1) {
              setFilters((value) => ({ ...value, page: Math.min(page, Math.max(1, Math.ceil(total / value.pageSize))) }));
            }
          }}>
            <label>跳至 <Input name="page" type="number" min="1" max={Math.max(1, Math.ceil(total / filters.pageSize))} required aria-label="跳转页码" /> 页</label>
            <Button type="submit">跳转</Button>
          </form>
        </div>
        <Pagination
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          onChange={(page) => setFilters((value) => ({ ...value, page }))}
        />
      </section>

      {selectedNo && (
        <Sheet title="反馈详情" onClose={() => setSelectedNo(null)}>
          <aside className="drawer feedback-drawer" aria-label="反馈详情">
            <header className="drawer-header">
              <div>
                <span className="eyebrow">Feedback detail</span>
                <h2>{selectedNo}</h2>
              </div>
              <IconButton label="关闭详情" onClick={() => setSelectedNo(null)}>
                <X size={19} />
              </IconButton>
            </header>
            <div className="drawer-body">
              {detailLoading ? (
                <LoadingBlock label="正在读取反馈详情" />
              ) : detailError ? (
                <div className="inline-error">{detailError}</div>
              ) : detail ? (
                <>
                  <section className="detail-section">
                    <div className="section-title">
                      <MessageSquare size={16} />
                      <h3>反馈内容</h3>
                    </div>
                    <p className="feedback-content">{detail.content}</p>
                  </section>

                  <section className="detail-meta-grid">
                    <div>
                      <span>联系方式</span>
                      <strong>{detail.contact}</strong>
                    </div>
                    <div>
                      <span>提交时间</span>
                      <strong>{formatDateTime(detail.created_at)}</strong>
                    </div>
                    <div>
                      <span>应用</span>
                      <strong>{extraValue(detail.extra, "app_name")}</strong>
                    </div>
                    <div>
                      <span>版本</span>
                      <strong>{extraValue(detail.extra, "app_version")}</strong>
                    </div>
                    <div>
                      <span>平台</span>
                      <strong>
                        {extraValue(detail.extra, "platform")}{" "}
                        {extraValue(detail.extra, "os_version")}
                      </strong>
                    </div>
                    <div>
                      <span>设备</span>
                      <strong>{extraValue(detail.extra, "device_model")}</strong>
                    </div>
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <ImageIcon size={16} />
                      <h3>图片附件</h3>
                      <Badge tone={detail.images.length ? "info" : "neutral"}>
                        {detail.images.length}
                      </Badge>
                      {detail.images.length > 0 && (
                        <Button onClick={() => setDetailRefreshKey((value) => value + 1)}>
                          刷新图片凭证
                        </Button>
                      )}
                    </div>
                    {detail.images.length === 0 ? (
                      <p className="muted-copy">本条反馈没有可预览图片。</p>
                    ) : (
                      <div className="image-grid">
                        {detail.images.map((image) => (
                          <a
                            key={image.attachment_id}
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            className="image-tile"
                          >
                            <img
                              src={image.url}
                              alt={`反馈附件 ${image.attachment_id}`}
                              loading="lazy"
                            />
                            <span>{formatBytes(image.size)}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="detail-section">
                    <div className="section-title">
                      <FileSearch size={16} />
                      <h3>上下文</h3>
                    </div>
                    <pre className="json-block">{compactJSON(detail.extra)}</pre>
                  </section>
                </>
              ) : null}
            </div>
            <footer className="drawer-footer">
              <div className="detail-footer-meta">
                <UserRound size={16} />
                <span>匿名客户端</span>
                <CalendarDays size={16} />
                <span>{formatDateTime(detail?.created_at)}</span>
              </div>
              <Button onClick={() => setSelectedNo(null)}>关闭</Button>
            </footer>
          </aside>
        </Sheet>
      )}
    </div>
  );
}
