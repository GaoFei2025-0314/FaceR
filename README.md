# FaceAuth — 人脸识别登录系统

基于 **Face++（旷视）** + **face-api.js** 的全栈人脸识别登录系统，使用 Next.js 14 App Router。

## 功能

- 🏠 **首页**：默认展示"人脸识别登录"选项
- 👁 **人脸登录**：本地人脸预检测 → 图像质量分析 → 自动截图 → Face++ 识别 → 跳转仪表盘
- 📝 **人脸注册**：填写信息 → 开摄像头 → 自动录入人脸到 FaceSet
- 🏛 **仪表盘**：登录后的首页，展示用户信息
- 🔐 **API 优化**：每次登录仅调用 1 次 Face++ API

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI**: React 18 + CSS Modules
- **本地人脸检测**: face-api.js (TinyFaceDetector)
- **人脸识别 API**: Face++ (旷视)
- **数据库**: JSON 文件（测试用）/ 可扩展为 PostgreSQL/MySQL

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Face++ 密钥

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```
FACEPP_API_KEY=你的_api_key
FACEPP_API_SECRET=你的_api_secret
SESSION_SECRET=任意32位以上字符串
```

> 去 https://console.faceplusplus.com.cn 注册，创建应用获取密钥
> 免费额度：1000 次/月

### 3. 创建数据目录

```bash
mkdir data
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 使用流程

1. 先访问 `/register` 注册一个测试用户（录入人脸）
2. 回到首页 `/`，点击"人脸识别登录"
3. 靠近摄像头，系统自动捕捉并识别
4. 识别成功后跳转到 `/dashboard`

## 项目结构

```
face-login/
├── app/
│   ├── page.tsx                    # 首页（登录选项）
│   ├── login/page.tsx             # 人脸登录页
│   ├── register/page.tsx          # 人脸注册页
│   ├── dashboard/page.tsx         # 登录后仪表盘
│   └── api/auth/
│       ├── face-login/route.ts    # 登录 API
│       ├── face-register/route.ts # 注册 API
│       ├── face-detect/route.ts  # 人脸检测 API
│       ├── me/route.ts            # 获取当前用户
│       └── logout/route.ts        # 退出登录
├── lib/
│   ├── facepp.ts                  # Face++ API 封装
│   ├── db.ts                      # JSON 文件数据库
│   └── session.ts                 # Cookie Session 管理
└── public/
    └── models/                    # face-api.js 模型（如需本地部署）
```

## 人脸识别流程（已优化）

### 两阶段检测策略

**第一阶段：本地检测（免费，每 300ms）**
1. 使用 face-api.js TinyFaceDetector 在浏览器端检测人脸
2. 分析图像质量（亮度 + 纹理）
3. 未检测到人脸 → 立即跳过，重置计数器

**第二阶段：Face++ API（仅 1 次/登录）**
1. 连续 3 帧检测到人脸 + 质量 ≥ 65%
2. 调用 Face++ search API 进行身份验证
3. 置信度超过 1e-5 阈值（约 73.975）→ 登录成功

### 参数配置

| 参数 | 值 | 说明 |
|------|-----|------|
| QUALITY_THRESHOLD | 0.65 | 图像质量阈值 |
| STABLE_FRAMES | 3 | 稳定帧数 |
| CAPTURE_INTERVAL | 300ms | 检测间隔 |

### API 调用优化

- **优化前**: 每次登录 6+ 次 API 调用
- **优化后**: 每次登录 **1 次** Face++ API
- 主要节省：使用 face-api.js 本地预检测，过滤无效帧

## 注意事项

- `data/db.json` 是测试用的 JSON 文件数据库，生产环境请换成 PostgreSQL/MySQL
- Session 使用简单 Base64 编码，生产环境请用 `iron-session` 或 `jose` 加密
- face-api.js 模型通过 CDN 加载（jsdelivr），确保网络畅通
- Face++ 免费版 API 限速 1000 次/月，优化后可用 1000+ 次登录