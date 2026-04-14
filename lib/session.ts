// lib/session.ts
import { cookies } from 'next/headers'

const SESSION_KEY = 'face_session'
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me'

export interface SessionData {
  userId: string
  name: string
  email: string
}

// 简单 base64 编码（测试用，生产环境请用 iron-session 或 jose 加密）
function encode(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function decode(token: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export async function setSession(data: SessionData) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_KEY, encode(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 小时
    path: '/',
  })
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_KEY)?.value
  if (!token) return null
  return decode(token)
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_KEY)
}
