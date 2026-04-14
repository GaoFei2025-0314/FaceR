import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function POST() {
  await clearSession()
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'))
}
