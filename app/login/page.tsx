'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Phase =
  | 'init'        // 初始化，等待摄像头
  | 'ready'       // 摄像头就绪，等待人脸靠近
  | 'detecting'   // 检测到人脸，质量评估中
  | 'capturing'   // 截图上传中
  | 'success'     // 识别成功
  | 'fail'        // 识别失败

const QUALITY_THRESHOLD = 0.65   // 质量分超过此值才截图
const STABLE_FRAMES = 3          // 只需要 3 帧就触发
const CAPTURE_INTERVAL = 300     // 分析帧间隔 ms

// face-api.js 人脸检测（免费本地检测）
let faceApiLoaded = false

async function loadFaceApiModels() {
  if (faceApiLoaded) return true

  if (typeof window === 'undefined' || !(window as any).faceapi) {
    console.log('[face-api] 库未加载')
    return false
  }

  try {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'
    await (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    faceApiLoaded = true
    console.log('[face-api] 模型加载成功')
    return true
  } catch (e) {
    console.log('[face-api] 模型加载失败:', e)
    return false
  }
}

async function hasLocalFace(video: HTMLVideoElement): Promise<boolean | null> {
  if (typeof window === 'undefined' || !(window as any).faceapi) {
    return null // 不支持
  }

  try {
    const detections = await (window as any).faceapi.detectAllFaces(
      video,
      new (window as any).faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    )
    return detections.length > 0
  } catch {
    return null // 检测失败
  }
}

/** 分析视频帧图像质量，返回 0~1 分数 */
function analyzeFrameQuality(video: HTMLVideoElement): number {
  const w = 240, h = 240
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

  // 水平翻转（因为 video 是镜像的）
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, w, h)

  // 只分析中心 60% 区域
  const pad = Math.floor(w * 0.2)
  const cw = w - pad * 2, ch = h - pad * 2
  const data = ctx.getImageData(pad, pad, cw, ch).data
  const n = data.length / 4

  let sum = 0
  const bvals: number[] = new Array(n)
  for (let i = 0; i < data.length; i += 4) {
    const b = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
    bvals[i >> 2] = b
    sum += b
  }
  const mean = sum / n

  // 方差越大说明纹理越丰富（人脸特征明显）
  let variance = 0
  for (let i = 0; i < n; i++) variance += (bvals[i] - mean) ** 2
  variance /= n

  // 亮度评分：偏离 0.5 越多分越低
  const briScore = Math.max(0, 1 - Math.abs(mean - 0.42) * 2.2)

  // 纹理评分：方差 0.02 以上满分
  const texScore = Math.min(variance / 0.02, 1)

  return briScore * 0.35 + texScore * 0.65
}

/** 截取视频帧并返回 base64（已修正镜像）*/
function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
}

export default function LoginPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [phase, setPhase] = useState<Phase>('init')
  const [quality, setQuality] = useState(0)
  const [hasFace, setHasFace] = useState<boolean | null>(null) // null=不支持, true=检测到, false=未检测到
  const [confidence, setConfidence] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [userName, setUserName] = useState('')
  const stableCount = useRef(0)

  // 启动摄像头
  useEffect(() => {
    let stream: MediaStream
    ;(async () => {
      try {
        // 先加载 face-api 模型
        const loaded = await loadFaceApiModels()
        if (!loaded) {
          console.log('[face-api] 加载失败，将使用 API 检测')
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 640, facingMode: 'user' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setPhase('ready')
        }
      } catch {
        setErrorMsg('无法访问摄像头，请检查浏览器权限')
        setPhase('fail')
      }
    })()
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // 开始质量检测循环
  useEffect(() => {
    // 'ready' 和 'detecting' 阶段都需要继续检测
    if (phase !== 'ready' && phase !== 'detecting') return

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      // 1. 先用本地免费检测（浏览器 FaceDetector API）
      const localFace = await hasLocalFace(video)
      // null = 不支持，true = 检测到人脸，false = 没检测到
      setHasFace(localFace)

      // 如果本地检测明确说没人脸，直接跳过
      if (localFace === false) {
        setQuality(0)
        stableCount.current = 0
        if (phase !== 'ready') setPhase('ready')
        return
      }

      // 2. 质量检测（本地分析）
      const score = analyzeFrameQuality(video)
      setQuality(score)

      if (score >= QUALITY_THRESHOLD) {
        // 3. 本地检测到人脸 + 质量达标 → 计数
        if (phase === 'ready') {
          setPhase('detecting')
        }
        stableCount.current += 1

        // 4. 达到 3 帧 → 直接调用登录 API（Face++ 只调用 1 次）
        if (stableCount.current >= STABLE_FRAMES) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setPhase('capturing')
          const base64 = captureFrame(video)
          await doFaceLogin(base64)
        }
      } else {
        stableCount.current = 0
        if (phase !== 'ready') setPhase('ready')
      }
    }, CAPTURE_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase])

  async function doFaceLogin(imageBase64: string) {
    try {
      const res = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await res.json()

      if (data.success) {
        setConfidence(data.confidence)
        setUserName(data.user.name)
        setPhase('success')
        // 1.5 秒后跳转到仪表盘
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        setErrorMsg(data.message ?? '识别失败，请重试')
        setPhase('fail')
      }
    } catch {
      setErrorMsg('网络错误，请重试')
      setPhase('fail')
    }
  }

  function retryLogin() {
    stableCount.current = 0
    setQuality(0)
    setErrorMsg('')
    setPhase('ready')
  }

  // ── 质量提示文案 ────────────────────────────────────
  function getQualityHint(score: number, hasFace: boolean | null): string {
    if (hasFace === false) return '👤 未检测到人脸，请站到镜头前'
    if (hasFace === null) return '⏳ 正在检测人脸...'
    if (score < 0.15) return '⚠️ 光线不足，请调整环境光线'
    if (score < 0.3) return '⚠️ 图像模糊，请靠近或调整角度'
    if (score < 0.45) return '⚠️ 纹理不足，请确保脸部特征清晰'
    if (score < 0.55) return '⚠️ 质量偏低，请正对摄像头'
    if (score < 0.65) return '⏳ 接近成功，请保持不动'
    return '✓ 质量良好，准备识别...'
  }

  // ── 状态文案 ────────────────────────────────────
  const statusMap: Record<Phase, { cls: string; dot: boolean; text: string }> = {
    init:       { cls: 'status-idle',      dot: false, text: '初始化摄像头...' },
    ready:      { cls: 'status-idle',      dot: false, text: getQualityHint(quality, hasFace) },
    detecting:  { cls: 'status-detecting', dot: true,  text: '检测到人脸，请保持不动...' },
    capturing:  { cls: 'status-capturing', dot: true,  text: '正在识别身份...' },
    success:    { cls: 'status-success',   dot: false, text: `识别成功！欢迎，${userName}` },
    fail:       { cls: 'status-error',     dot: false, text: errorMsg || '识别失败' },
  }

  const status = statusMap[phase]

  const qualityColor =
    quality < 0.3 ? '#ff4466' :
    quality < 0.55 ? '#ffaa00' :
    '#00d4ff'

  const qualityPct = Math.round(quality * 100)

  return (
    <main>
      <div className="card">
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <span className="label">// 人脸识别登录</span>
          <h2 className="subtitle" style={{ marginTop: 6 }}>身份验证</h2>
          <p className="desc" style={{ marginTop: 4 }}>
            靠近摄像头，系统将自动捕捉并完成识别
          </p>
        </div>

        {/* Camera */}
        <div className="camera-wrap">
          <video ref={videoRef} autoPlay muted playsInline />

          {/* Scan animation */}
          {(phase === 'ready' || phase === 'detecting') && (
            <div className="scan-line" />
          )}

          {/* Corner brackets */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          {/* Face guide circle */}
          <div className="face-guide" style={{
            borderColor: quality > QUALITY_THRESHOLD
              ? 'rgba(0,212,255,0.7)'
              : 'rgba(0,212,255,0.25)',
            boxShadow: quality > QUALITY_THRESHOLD
              ? '0 0 20px rgba(0,212,255,0.2)'
              : 'none',
            transition: 'all 0.3s ease',
          }} />

          {/* Init overlay */}
          {phase === 'init' && (
            <div className="camera-overlay">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                ⏳ 初始化中...
              </div>
            </div>
          )}

          {/* Success overlay */}
          {phase === 'success' && (
            <div className="camera-overlay flash-success">
              <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
              <div style={{ color: 'var(--success)', fontSize: 14, letterSpacing: '0.1em' }}>
                VERIFIED
              </div>
              {confidence !== null && (
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                  置信度 {confidence.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {/* Fail overlay */}
          {phase === 'fail' && (
            <div className="camera-overlay">
              <div style={{ fontSize: 36, marginBottom: 8 }}>✕</div>
              <div style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center', padding: '0 20px' }}>
                {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* Quality bar */}
        {(phase === 'ready' || phase === 'detecting') && (
          <div className="quality-bar-wrap">
            <span className="quality-bar-label">图像质量</span>
            <div className="quality-bar-track">
              <div
                className="quality-bar-fill"
                style={{
                  width: `${qualityPct}%`,
                  background: qualityColor,
                  boxShadow: quality > 0.5 ? `0 0 6px ${qualityColor}` : 'none',
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: qualityColor, minWidth: 30, textAlign: 'right' }}>
              {qualityPct}%
            </span>
          </div>
        )}

        {/* Status pill */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span className={`status-pill ${status.cls}`}>
            {status.dot && <span className="dot" />}
            {status.text}
          </span>
        </div>

        {/* Retry or back */}
        {phase === 'fail' && (
          <button className="btn-primary" onClick={retryLogin}>
            重新识别
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost">← 返回登录选项</button>
          </Link>
        </div>

        {/* Tip */}
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginTop: 16,
          padding: '8px 12px',
          background: quality < 0.4 ? 'rgba(255,100,100,0.1)' : 'transparent',
          borderRadius: 6,
          border: quality < 0.4 ? '1px solid rgba(255,100,100,0.3)' : 'none'
        }}>
          {quality < 0.4 ? (
            <>
              <strong>调整建议：</strong><br/>
              1. 确保光线充足但不过曝<br/>
              2. 调整与摄像头距离（约30-50cm）<br/>
              3. 避免纯色背景和衣服
            </>
          ) : (
            <>
              首次使用？先去{' '}
              <Link href="/register" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                注册人脸
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
