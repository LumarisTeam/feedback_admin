import {
  Aperture,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { FeedbackAdminApi } from "./api";
import { AppShell, type View } from "./components/AppShell";
import { Button, Field, Toast, type ToastMessage } from "./components/Ui";
import { CentersPage } from "./pages/CentersPage";
import { DebugPage } from "./pages/DebugPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { PublicFeedbackPage } from "./pages/PublicFeedbackPage";

const TOKEN_KEY = "lens-feedback-admin-token";
const BASE_URL_KEY = "lens-feedback-admin-base-url";
const OPERATOR_KEY = "lens-feedback-admin-operator";

function initialSession() {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? "";
  return {
    token,
    baseUrl: localStorage.getItem(BASE_URL_KEY) ?? "",
    operator: localStorage.getItem(OPERATOR_KEY) ?? "admin",
  };
}

export default function App() {
  if (window.location.pathname.replace(/\/+$/, "") === "/feedback") {
    return <PublicFeedbackPage />;
  }
  return <AdminApp />;
}

function AdminApp() {
  const [session, setSession] = useState(initialSession);
  const [activeView, setActiveView] = useState<View>("debug");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((next: ToastMessage) => {
    setToast(next);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setSession((current) => ({ ...current, token: "" }));
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearSession();
    setToast({ kind: "error", text: "管理员凭证无效或已过期，请重新连接" });
  }, [clearSession]);

  const api = useMemo(
    () =>
      new FeedbackAdminApi(
        session.baseUrl,
        session.token,
        session.operator,
      ),
    [session.baseUrl, session.operator, session.token],
  );

  if (!session.token) {
    return (
      <>
        <LoginPage
          baseUrl={session.baseUrl}
          operator={session.operator}
          onConnected={(next) => {
            sessionStorage.setItem(TOKEN_KEY, next.token);
            localStorage.setItem(BASE_URL_KEY, next.baseUrl);
            localStorage.setItem(OPERATOR_KEY, next.operator);
            setSession(next);
            setToast({ kind: "success", text: "已连接反馈服务" });
          }}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  return (
    <>
      <AppShell
        activeView={activeView}
        onNavigate={setActiveView}
        baseUrl={session.baseUrl || "Vite 开发代理"}
        operator={session.operator}
        onLogout={clearSession}
      >
        {activeView === "feedbacks" && (
          <FeedbackPage
            api={api}
            notify={notify}
            onUnauthorized={handleUnauthorized}
          />
        )}
        {activeView === "centers" && (
          <CentersPage
            api={api}
            notify={notify}
            onUnauthorized={handleUnauthorized}
          />
        )}
        {activeView === "debug" && (
          <DebugPage
            api={api}
            notify={notify}
            onGoCenters={() => setActiveView("centers")}
            onGoFeedbacks={() => setActiveView("feedbacks")}
          />
        )}
      </AppShell>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function LoginPage({
  baseUrl: savedBaseUrl,
  operator: savedOperator,
  onConnected,
}: {
  baseUrl: string;
  operator: string;
  onConnected: (session: {
    token: string;
    baseUrl: string;
    operator: string;
  }) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [operator, setOperator] = useState(savedOperator || "admin");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!token.trim()) {
      setError("请输入管理员 Token");
      return;
    }
    setBusy(true);
    try {
      const api = new FeedbackAdminApi(
        baseUrl.trim(),
        token.trim(),
        operator.trim() || "admin",
      );
      await api.listCenters({ keyword: "", status: "", page: 1, pageSize: 1 });
      onConnected({
        token: token.trim(),
        baseUrl: baseUrl.trim(),
        operator: operator.trim() || "admin",
      });
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : "连接失败",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-brand">
          <div className="brand-mark large">
            <Aperture size={24} />
          </div>
          <div>
            <strong>Lens Feedback</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <div className="login-statement">
          <span className="eyebrow">Operations workspace</span>
          <h1>把每一次反馈<br />变成可控的调试记录。</h1>
          <p>
            统一查看反馈、管理应用接入，并通过真实校验链路验证后端服务。
          </p>
        </div>
        <div className="login-capabilities">
          <div>
            <ShieldCheck size={18} />
            <span>管理员 Bearer Token 鉴权</span>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <span>反馈中心与一次性校验码管理</span>
          </div>
          <div>
            <Server size={18} />
            <span>连接 Lens_Backend</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel-heading">
          <span className="eyebrow">Secure connection</span>
          <h2>连接反馈服务</h2>
          <p>Token 仅保存在当前浏览器会话中。</p>
        </div>

        <form className="login-form" onSubmit={connect}>
          <Field label="API 地址" hint="留空时使用 Vite 的 /api 开发代理。">
            <div className="input-with-icon">
              <Server size={16} />
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://127.0.0.1:8080"
                autoComplete="url"
              />
            </div>
          </Field>
          <Field label="管理员 Token" required>
            <div className="input-with-icon input-with-action">
              <LockKeyhole size={16} />
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="ADMIN_API_TOKEN"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field-action"
                aria-label={showToken ? "隐藏 Token" : "显示 Token"}
                onClick={() => setShowToken((value) => !value)}
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="操作人">
            <div className="input-with-icon">
              <KeyRound size={16} />
              <input
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
                placeholder="admin"
              />
            </div>
          </Field>

          {error && <div className="form-error">{error}</div>}

          <Button
            className="login-submit"
            tone="primary"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <LockKeyhole size={18} />
            )}
            {busy ? "正在验证" : "连接服务"}
            {!busy && <ArrowRight size={17} />}
          </Button>
        </form>

        <footer className="login-footer">
          <span>Lens Feedback Admin</span>
          <span>v0.1.0</span>
        </footer>
      </section>
    </main>
  );
}
