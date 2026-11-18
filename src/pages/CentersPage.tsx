import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input, NativeSelect } from "../components/ui/input";
import {
  ChevronRight,
  CirclePlus,
  KeyRound,
  MessageSquareText,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { FeedbackAdminApi } from "../api";
import { ApiError } from "../api";
import { PageHeader } from "../components/AppShell";
import { CenterDrawer } from "../components/CenterDrawer";
import { CenterFormDialog } from "../components/CenterFormDialog";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  LoadingBlock,
  Pagination,
  SecretDialog,
  type ToastMessage,
} from "../components/Ui";
import { formatDate, formatDateTime } from "../format";
import type {
  CenterFilters,
  CenterInput,
  FeedbackCenterDetail,
  FeedbackCenterListItem,
} from "../types";

const initialFilters: CenterFilters = {
  keyword: "",
  status: "",
  page: 1,
  pageSize: 20,
};

const snModeLabel = {
  whitelist: "白名单",
  prefix: "前缀匹配",
  any: "任意 SN",
};

export function CentersPage({
  api,
  notify,
  onUnauthorized,
}: {
  api: FeedbackAdminApi;
  notify: (toast: ToastMessage) => void;
  onUnauthorized: () => void;
}) {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [draftStatus, setDraftStatus] = useState<"" | "enabled" | "disabled">(
    "",
  );
  const [filters, setFilters] = useState<CenterFilters>(initialFilters);
  const [items, setItems] = useState<FeedbackCenterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] =
    useState<FeedbackCenterDetail | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    centerId: string;
    secret: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .listCenters(filters)
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
          text: error instanceof Error ? error.message : "加载反馈中心失败",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, filters, notify, onUnauthorized, refreshKey]);

  const openCreate = () => {
    setEditingCenter(null);
    setFormOpen(true);
  };

  const openEdit = (center: FeedbackCenterDetail) => {
    setEditingCenter(center);
    setFormOpen(true);
  };

  const submitCenter = async (input: CenterInput) => {
    setFormBusy(true);
    try {
      if (editingCenter) {
        await api.updateCenter(editingCenter.centerId, input);
        notify({ kind: "success", text: "反馈中心配置已更新" });
      } else {
        const result = await api.createCenter(input);
        setCreatedSecret({
          centerId: result.centerId,
          secret: result.secret,
        });
        notify({ kind: "success", text: "反馈中心已创建" });
      }
      setFormOpen(false);
      setEditingCenter(null);
      setRefreshKey((value) => value + 1);
      setDrawerKey((value) => value + 1);
    } catch (error) {
      notify({
        kind: "error",
        text: error instanceof Error ? error.message : "保存反馈中心失败",
      });
    } finally {
      setFormBusy(false);
    }
  };

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters({
      ...initialFilters,
      keyword: draftKeyword,
      status: draftStatus,
    });
  };

  const clearFilters = () => {
    setDraftKeyword("");
    setDraftStatus("");
    setFilters(initialFilters);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Access control"
        title="反馈中心"
        description="管理应用接入、SN 白名单、密钥生命周期与操作审计。"
        actions={
          <>
            <Button onClick={() => setRefreshKey((value) => value + 1)}>
              <RefreshCw size={16} />
              刷新
            </Button>
            <Button tone="primary" onClick={openCreate}>
              <CirclePlus size={17} />
              新建中心
            </Button>
          </>
        }
      />

      <form className="filter-bar center-filter" onSubmit={applyFilters}>
        <div className="filter-lead">
          <SlidersHorizontal size={16} />
          <span>筛选</span>
        </div>
        <label className="compact-field compact-field-wide">
          <span>关键词</span>
          <div className="input-with-icon">
            <Search size={15} />
            <Input
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              placeholder="名称、Center ID 或 AppID"
            />
          </div>
        </label>
        <label className="compact-field">
          <span>状态</span>
          <NativeSelect
            value={draftStatus}
            onChange={(event) =>
              setDraftStatus(
                event.target.value as "" | "enabled" | "disabled",
              )
            }
          >
            <option value="">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已禁用</option>
          </NativeSelect>
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

      <section className="data-panel" aria-label="反馈中心列表">
        <div className="data-panel-head">
          <div>
            <h2>接入配置</h2>
            <span>{total} 个反馈中心</span>
          </div>
          {loading && <LoadingBlock label="正在刷新" />}
        </div>

        {!loading && items.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText size={24} />}
            title="还没有反馈中心"
            description="新建一个中心后，客户端才能获取校验码并提交反馈。"
            action={
              <Button tone="primary" onClick={openCreate}>
                <CirclePlus size={17} />
                新建中心
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <Table className="data-table center-table">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>应用 / 环境</TableHead>
                  <TableHead>SN 策略</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>最近调用</TableHead>
                  <TableHead aria-label="操作" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((center) => (
                  <TableRow
                    key={center.centerId}
                    className="clickable-row"
                    onClick={() => setSelectedId(center.centerId)}
                  >
                    <TableCell>
                      <div className="stacked-cell">
                        <strong>{center.name}</strong>
                        <code>{center.centerId}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="stacked-cell">
                        <strong>{center.appId}</strong>
                        <span>{center.env}</span>
                      </div>
                    </TableCell>
                    <TableCell>{snModeLabel[center.snMode]}</TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          center.status === "enabled" ? "success" : "warning"
                        }
                      >
                        {center.status === "enabled" ? "已启用" : "已禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-metric">
                        <KeyRound size={15} />
                        v{center.secretVersion}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(center.expireAt)}</TableCell>
                    <TableCell>{formatDateTime(center.lastUsedAt)}</TableCell>
                    <TableCell>
                      <IconButton
                        label={`查看反馈中心 ${center.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(center.centerId);
                        }}
                      >
                        <ChevronRight className="row-chevron" size={17} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          onChange={(page) => setFilters((value) => ({ ...value, page }))}
        />
      </section>

      {selectedId && (
        <CenterDrawer
          key={`${selectedId}-${drawerKey}`}
          api={api}
          centerId={selectedId}
          notify={notify}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
          onChanged={() => {
            setRefreshKey((value) => value + 1);
          }}
        />
      )}

      <CenterFormDialog
        open={formOpen}
        center={editingCenter}
        busy={formBusy}
        onClose={() => {
          if (!formBusy) {
            setFormOpen(false);
            setEditingCenter(null);
          }
        }}
        onSubmit={submitCenter}
      />

      <SecretDialog
        open={Boolean(createdSecret)}
        title="反馈中心已创建"
        centerId={createdSecret?.centerId ?? ""}
        secret={createdSecret?.secret ?? ""}
        onClose={() => setCreatedSecret(null)}
      />
    </div>
  );
}
