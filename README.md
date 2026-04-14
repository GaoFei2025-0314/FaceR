# FaceAuth — Next.js 人脸识别登录

基于 **Face++（旷视）** 的全栈人脸识别登录 Demo，使用 Next.js 14 App Router。

## 功能

- 🏠 **首页**：默认展示"人脸识别登录"选项
- 👁 **人脸登录**：开摄像头 → 自动检测图像质量 → 截图 → Face++ 识别 → 跳转仪表盘
- 📝 **人脸注册**：填写信息 → 开摄像头 → 自动录入人脸
- 🏛 **仪表盘**：登录后的首页，展示用户信息

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
│       ├── me/route.ts            # 获取当前用户
│       └── logout/route.ts        # 退出登录
├── lib/
│   ├── facepp.ts                  # Face++ API 封装
│   ├── db.ts                      # JSON 文件数据库（测试用）
│   └── session.ts                 # Cookie Session 管理
└── data/
    └── db.json                    # 自动生成的数据文件
```

## 人脸识别逻辑

**自动截图触发条件**（无需手动点击）：
1. 分析每帧图像的亮度和纹理（图像质量评分）
2. 质量分 ≥ 65% 时开始计数
3. 连续 6 帧（约 1.8 秒）质量达标 → 自动截图上传

**Face++ 识别流程**：
- 使用 `/v3/search` 在 FaceSet 中搜索最匹配人脸
- 置信度需超过 Face++ 推荐的 `1e-5` 阈值（约 73.975）才认为匹配成功

## 注意事项

- `data/db.json` 是测试用的 JSON 文件数据库，生产环境请换成 PostgreSQL/MySQL
- Session 使用简单 Base64 编码，生产环境请用 `iron-session` 或 `jose` 加密
- Face++ 免费版 API 限速，并发高时请升级套餐
