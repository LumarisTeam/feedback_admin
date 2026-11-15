# Lens Feedback Admin

`Lens_Backend` 的 Web 调试与管理端。管理反馈记录、反馈中心、一次性校验码，并通过真实客户端接口完成调试提交。

## 页面入口

- 管理端：`http://127.0.0.1:5173/`
- 用户反馈端：`http://127.0.0.1:5173/feedback`

用户反馈端不需要管理员 Token。它通过以下环境变量确定要提交到的反馈中心：

```text
VITE_FEEDBACK_CENTER_ID=fc_xxx
VITE_FEEDBACK_SN=lumaris-demo
VITE_FEEDBACK_APP_NAME=lumaris
```

需要同时提供光序和光汇时，改用应用列表：

```text
VITE_FEEDBACK_APPS=[{"key":"lumaris","label":"光序","centerId":"fc_xxx","sn":"lumaris-demo","appName":"lumaris"},{"key":"lumalis","label":"光汇","centerId":"fc_yyy","sn":"lumalis-demo","appName":"lumalis"}]
```

用户选择软件后，前端使用对应的反馈中心取码和提交。后端以反馈中心的
`app_id` 为准写入 `extra.app_name`，不会接受客户端伪造的软件归属。
生产环境部署
`/feedback` 时，需要让静态服务器将未知路径回退到 `index.html`。

## 功能

- 管理员 Token 登录与连接检测
- 反馈列表、条件筛选、详情与图片预览
- 反馈中心创建、编辑、启停、密钥重置
- SN 白名单、前缀和任意 SN 三种接入模式
- 审计日志与测试校验码生成
- 调试提交：自动取一次性校验码、提交反馈、验证幂等与重放拦截
- 桌面端与移动端自适应

## 本地运行

```powershell
cd E:\dev\feedback_admin
npm install
npm run dev
```

开发服务器默认运行在 `http://127.0.0.1:5173`，并将 `/api` 代理到
`http://127.0.0.1:8080`。登录页的 API 地址留空即可使用代理。

登录需要 `Lens_Backend` 中配置的 `ADMIN_API_TOKEN`。

如需在没有腾讯云 COS 凭证时验证图片上传，另开一个终端启动本地假 COS：

```powershell
npm run dev:fake-cos
```

启动后端时设置：

```powershell
$env:S3_CDN_URL = "http://127.0.0.1:9000"
```

然后即可在“测试反馈”页选择图片，完整验证 `presign -> PUT -> confirm -> 提交`
链路。假 COS 仅用于本机联调，不会持久化文件。

## 构建

```powershell
npm run typecheck
npm run build
```

生产环境建议将 `dist` 部署到静态站点，并由反向代理将 `/api` 转发到反馈后端。
如果前后端不同源，需要在后端配置 `CORS_ALLOWED_ORIGINS`，并允许浏览器发送
`Authorization`、`X-Operator`、`X-Admin-Role`、`X-Client-ID` 和反馈校验头。

## 自动化验证

后端、Redis 和本页开发服务器都启动后运行：

```powershell
# 真实接口链：创建/更新中心、取码、提交、重放拦截、幂等、密钥重置、启停
npm run test:api

# 浏览器链：登录、新建中心、测试码、启停、调试提交、反馈详情、移动端布局
npm run test:e2e

# 假 COS 已启动时，额外验证图片上传和详情预览
$env:FEEDBACK_TEST_IMAGE = "1"
npm run test:e2e
```

`test:e2e` 默认使用本机 Microsoft Edge。可通过 `ADMIN_API_TOKEN` 覆盖测试 Token。

## 调试链路

“调试提交”页面调用的是 SDK 使用的客户端链路：

```text
POST /api/v1/feedback-centers/:centerId/codes
POST /api/v1/feedbacks
```

“测试反馈”页支持最多 6 张 JPG、PNG、WebP 图片，会在浏览器内压缩到 5MB 内，
然后按 SDK 相同链路完成 `presign -> PUT COS -> confirm`，提交时携带
`attachment_ids`。使用真实 COS 时，需要为桶配置允许管理端来源的 CORS。
