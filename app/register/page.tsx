'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Phase = 'form' | 'camera' | 'capturing' | 'success' | 'fail'

function analyzeFrameQuality(video: HTMLVideoElement): number {
  const w = 240, h = 240
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.translate(w, 0); ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, w, h)
  const pad = Math.floor(w * 0.2)
  const data = ctx.getImageData(pad, pad, w - pad * 2, h - pad * 2).data
  const n = data.length / 4
  let sum = 0
  const bvals: number[] = new Array(n)
  for (let i = 0; i < data.length; i += 4) {
    const b = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
    bvals[i >> 2] = b; sum += b
  }
  const mean = sum / n
  let variance = 0
  for (let i = 0; i < n; i++) variance += (bvals[i] - mean) ** 2
  variance /= n
  return Math.max(0, 1 - Math.abs(mean - 0.42) * 2.2) * 0.35 + Math.min(variance / 0.02, 1) * 0.65
}

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth; canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
}

export default function RegisterPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stableCount = useRef(0)

  const [phase, setPhase] = useState<Phase>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [quality, setQuality] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [faceToken, setFaceToken] = useState('')

  async function startCamera() {
    if (!name.trim() || !email.trim()) {
      setErrorMsg('请填写姓名和邮箱')
      return
    }
    setErrorMsg('')
    setPhase('camera')
  }

  useEffect(() => {
    if (phase !== 'camera') return
    let stream: MediaStream
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 640, facingMode: 'user' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        setErrorMsg('无法访问摄像头')
        setPhase('fail')
      }

      intervalRef.current = setInterval(() => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        const score = analyzeFrameQuality(video)
        setQuality(score)
        if (score >= 0.65) {
          stableCount.current += 1
          if (stableCount.current >= 6) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setPhase('capturing')
            const base64 = captureFrame(video)
            doRegister(base64)
          }
        } else {
          stableCount.current = 0
        }
      }, 300)
    })()

    return () => {
      stream?.getTracks().forEach(t => t.stop())
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase])

  async function doRegister(imageBase64: string) {
    try {
      const res = await fetch('/api/auth/face-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), imageBase64 }),
      })
      const data = await res.json()
      if (data.success) {
        setFaceToken(data.faceToken)
        setPhase('success')
      } else {
        setErrorMsg(data.message ?? '注册失败')
        setPhase('fail')
      }
    } catch {
      setErrorMsg('网络错误，请重试')
      setPhase('fail')
    }
  }

  const qualityColor = quality < 0.3 ? '#ff4466' : quality < 0.55 ? '#ffaa00' : '#00d4ff'

  return (
    <main>
      <div className="card">
        <div style={{ marginBottom: 24 }}>
          <span className="label">// 新用户注册</span>
          <h2 className="subtitle" style={{ marginTop: 6 }}>人脸录入</h2>
          <p className="desc" style={{ marginTop: 4 }}>填写信息后，靠近摄像头完成人脸录入</p>
        </div>

        {/* ── 表单 ── */}
        {phase === 'form' && (
          <>
            <div className="input-group">
              <label className="input-label">姓名</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="你的名字"
              />
            </div>
            <div className="input-group">
              <label className="input-label">邮箱</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            {errorMsg && (
              <p style={{ color: 'var(--error)', fontSize: 12, marginBottom: 12 }}>{errorMsg}</p>
            )}
            <button className="btn-primary" onClick={startCamera}>
              开始人脸录入 →
            </button>
          </>
        )}

        {/* ── 摄像头 ── */}
        {(phase === 'camera' || phase === 'capturing') && (
          <>
            <div className="camera-wrap">
              <video ref={videoRef} autoPlay muted playsInline />
              {phase === 'camera' && <div className="scan-line" />}
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />
              <div className="face-guide" style={{
                borderColor: quality > 0.65 ? 'rgba(0,212,255,0.7)' : 'rgba(0,212,255,0.25)',
                transition: 'all 0.3s',
              }} />
              {phase === 'capturing' && (
                <div className="camera-overlay">
                  <div style={{ fontSize: 30, marginBottom: 8 }}>📡</div>
                  <div style={{ fontSize: 13, color: 'var(--cyan)' }}>正在上传录入...</div>
                </div>
              )}
            </div>

            {phase === 'camera' && (
              <div className="quality-bar-wrap">
                <span className="quality-bar-label">图像质量</span>
                <div className="quality-bar-track">
                  <div className="quality-bar-fill" style={{
                    width: `${Math.round(quality * 100)}%`,
                    background: qualityColor,
                  }} />
                </div>
                <span style={{ fontSize: 11, color: qualityColor, minWidth: 30, textAlign: 'right' }}>
                  {Math.round(quality * 100)}%
                </span>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <span className={`status-pill ${phase === 'camera' ? 'status-detecting' : 'status-capturing'}`}>
                {phase === 'camera' && <span className="dot" />}
                {phase === 'camera' ? '请正对摄像头，质量达标后自动录入' : '录入中，请勿移动...'}
              </span>
            </div>
          </>
        )}

        {/* ── 成功 ── */}
        {phase === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }} className="fade-up">
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 className="subtitle">人脸录入成功！</h2>
            <p className="desc">欢迎，{name}。现在可以使用人脸识别登录了。</p>
            {faceToken && (
              <div style={{
                marginTop: 20,
                padding: '10px 14px',
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                textAlign: 'left',
              }}>
                <span className="label" style={{ display: 'block', marginBottom: 4 }}>face token</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {faceToken}
                </span>
              </div>
            )}
            <Link href="/login" style={{ textDecoration: 'none', display: 'block', marginTop: 24 }}>
              <button className="btn-primary">立即登录 →</button>
            </Link>
          </div>
        )}

        {/* ── 失败 ── */}
        {phase === 'fail' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <p style={{ color: 'var(--error)', fontSize: 13 }}>{errorMsg}</p>
            <button
              className="btn-primary"
              onClick={() => { stableCount.current = 0; setQuality(0); setPhase('form') }}
              style={{ marginTop: 16 }}
            >
              重新尝试
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost">← 返回登录</button>
          </Link>
        </div>
      </div>
    </main>
  )
}
