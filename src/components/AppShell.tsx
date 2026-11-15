import {
  Aperture,
  ChevronRight,
  CircleUserRound,
  Inbox,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  RadioTower,
  Settings2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { IconButton } from "./Ui";

export type View = "feedbacks" | "centers" | "debug";

const navItems: Array<{
  id: View;
  label: string;
  description: string;
  icon: typeof Inbox;
}> = [
  {
    id: "debug",
    label: "测试反馈",
    description: "手工填写并提交",
    icon: RadioTower,
  },
  {
    id: "feedbacks",
    label: "反馈记录",
    description: "查看与检索用户反馈",
    icon: Inbox,
  },
  {
    id: "centers",
    label: "反馈中心",
    description: "管理应用接入与密钥",
    icon: MessageSquareText,
  },
];

export function AppShell({
  activeView,
  onNavigate,
  baseUrl,
  operator,
  onLogout,
  children,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  baseUrl: string;
  operator: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Aperture size={19} />
          </div>
          <div className="brand-copy">
            <strong>Lens Feedback</strong>
            <span>Admin Console</span>
          </div>
          <IconButton
            label={collapsed ? "展开侧栏" : "收起侧栏"}
            className="sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
          >
            <PanelLeftClose size={17} />
          </IconButton>
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={19} />
                <span className="nav-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <ChevronRight className="nav-arrow" size={16} />
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="connection">
            <CircleUserRound size={18} />
            <div>
              <strong>{operator || "admin"}</strong>
              <span title={baseUrl}>{baseUrl || "同源 API"}</span>
            </div>
            <span className="connection-dot" title="已连接" />
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
            <LogOut size={16} />
            <span>退出连接</span>
          </button>
        </div>
      </aside>

      <div className="mobile-header">
        <div className="brand">
          <div className="brand-mark">
            <Aperture size={18} />
          </div>
          <strong>Lens Feedback</strong>
        </div>
        <IconButton label="退出连接" onClick={onLogout}>
          <LogOut size={17} />
        </IconButton>
      </div>

      <main className="main">
        <div className="mobile-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === activeView ? "active" : ""}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="连接设置" onClick={onClick}>
      <Settings2 size={18} />
    </IconButton>
  );
}
