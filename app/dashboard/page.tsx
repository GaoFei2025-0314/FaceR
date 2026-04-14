import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const user = db.getUserById(session.userId)
  if (!user) redirect('/')

  const loginTime = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  })

  return (
    <main>
      <div className="card fade-up">
        {/* 顶部标签 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span className="label" style={{ color: 'var(--success)', opacity: 1 }}>
            ◉ 已验证
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            FACE-AUTH / DASHBOARD
          </span>
        </div>

        {/* Avatar */}
        <div className="avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>

        {/* Welcome */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 className="display" style={{ fontSize: '1.8rem' }}>
            欢迎回来
          </h1>
          <p style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 14, marginTop: 6 }}>
            {user.name}
          </p>
        </div>

        {/* Info rows */}
        <div style={{
          background: 'rgba(0,212,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '4px 16px',
          marginBottom: 24,
        }}>
          <div className="info-row">
            <span className="info-key">USER_ID</span>
            <span className="info-val" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {user.id}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">EMAIL</span>
            <span className="info-val">{user.email}</span>
          </div>
          <div className="info-row">
            <span className="info-key">LOGIN_METHOD</span>
            <span className="info-val" style={{ color: 'var(--cyan)' }}>FACE_RECOGNITION</span>
          </div>
          <div className="info-row">
            <span className="info-key">SESSION_TIME</span>
            <span className="info-val" style={{ fontSize: 12 }}>{loginTime}</span>
          </div>
          <div className="info-row">
            <span className="info-key">REGISTERED</span>
            <span className="info-val" style={{ fontSize: 12 }}>
              {new Date(user.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="btn-primary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            退出登录
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost">注册新人脸账户</button>
          </Link>
        </div>
      </div>
    </main>
  )
}
