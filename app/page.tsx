import Link from 'next/link'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // 已登录直接跳仪表盘
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <main>
      <div className="card">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <span className="label">// face-auth system</span>
          <h1 className="display">欢迎回来</h1>
          <p className="desc">选择登录方式继续访问你的账户</p>
        </div>

        {/* 人脸登录 — 默认高亮选项 */}
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <button className="login-option featured">
            <div className="login-option-icon">👁</div>
            <div className="login-option-text">
              <strong>人脸识别登录</strong>
              <span>靠近摄像头，自动完成身份验证</span>
            </div>
            <span className="login-option-arrow">›</span>
          </button>
        </Link>

        {/* 其他方式（仅展示，不实现） */}
        <button className="login-option" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
          <div className="login-option-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>🔑</div>
          <div className="login-option-text">
            <strong>密码登录</strong>
            <span>使用邮箱 + 密码登录</span>
          </div>
          <span className="login-option-arrow">›</span>
        </button>

        <div className="divider">或者</div>

        {/* 注册入口 */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            还没有账户？{' '}
          </span>
          <Link
            href="/register"
            style={{ fontSize: 12, color: 'var(--cyan)', textDecoration: 'none' }}
          >
            注册测试账户 →
          </Link>
        </div>

        {/* 底部 badge */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            POWERED BY
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              opacity: 0.7,
            }}
          >
            FACE++ · MEGVII
          </span>
        </div>
      </div>
    </main>
  )
}
