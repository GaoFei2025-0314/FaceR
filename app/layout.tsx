import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FaceAuth — 人脸识别登录',
  description: '基于 Face++ 的人脸识别登录系统',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
