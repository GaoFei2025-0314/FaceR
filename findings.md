# Findings & Decisions

## Requirements
- 检查项目中的 bug 并修复。
- 修复后必须运行项目构建和测试验证。
- 最终列出所有发现的 bug、修复内容、验证结果。
- 不做无关重构，保持现有代码风格。

## Research Findings
- 项目是 Next.js + TypeScript 的 App Router 应用。
- `package.json` 目前只有 `dev`、`build`、`start` 脚本，没有现成测试脚本。
- 工作目录不是 git 仓库，无法依赖 `git status`/diff 做变更排查。
- 项目根目录存在异常目录名 `"{app"`，需要后续确认是否与实际问题相关。
- `npm run build` 能完成编译，但在 `Running TypeScript ...` 阶段失败，错误为 `spawn EPERM`。
- 直接运行 `npx tsc --noEmit` 能稳定复现 5 个类型错误，说明项目本身存在真实代码问题，不只是环境问题。
- 在当前环境中，`child_process.spawn()` 必现 `EPERM`，但 `worker_threads` 可正常工作。
- `lib/session.ts` 使用了旧版同步 `cookies()` API；当前 Next 16 类型要求异步调用。
- `app/api/auth/face-register/route.ts` 中 `facesetToken` 在首次创建 FaceSet 后仍被视为 `string | null`。
- 修复后 `npm test` 已通过，`npm run build` 也已成功完成。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 先从构建和核心路由/库文件排查 | 能最快发现语法、类型、服务端/客户端边界问题 |
| 测试策略以最小回归为主 | 项目暂无测试框架，需避免引入无关复杂度 |
| 将 `tsc --noEmit` 作为最小测试回归 | 能直接覆盖本次已确认的类型层 bug |
| 不处理异常目录 `"{app"` | 目前未见其参与构建或报错，先避免无关改动 |
| 不引入额外测试框架 | 当前 bug 都能通过现有 TypeScript/Next 构建链路验证，避免无关扩展 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 当前目录不是 git 仓库 | 继续基于文件系统和构建输出来排查 |
| `next build` 依赖子进程 worker，而当前环境禁止 `spawn()` | 计划通过 Next 的 `experimental.workerThreads` 配置切换 worker 实现 |

## Resources
- `package.json`
- `README.md`
- `app/`
- `lib/`
- `next.config.js`
- `tsconfig.json`

## Visual/Browser Findings
- 暂无
