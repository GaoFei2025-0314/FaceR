import { NextResponse } from 'next/server'
import { searchFace } from '@/lib/facepp'
import { db } from '@/lib/db'
import { setSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, message: '缺少图像数据' }, { status: 400 })
    }

    // 获取 FaceSet token
    const facesetToken = db.getFacesetToken()
    if (!facesetToken) {
      return NextResponse.json(
        { success: false, message: '人脸库未初始化，请先注册一个用户' },
        { status: 500 }
      )
    }

    // 调用 Face++ 在 FaceSet 中搜索
    const result = await searchFace(imageBase64, facesetToken)

    if (!result) {
      return NextResponse.json(
        { success: false, message: '未检测到人脸，请正对摄像头' },
        { status: 401 }
      )
    }

    // Face++ 推荐阈值（误识率 1e-5 对应约 73.975）
    // 登录场景建议用严格阈值
    const THRESHOLD = result.thresholds['1e-5'] ?? 73.975
    if (result.confidence < THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          message: `识别置信度不足（${result.confidence.toFixed(1)} < ${THRESHOLD.toFixed(1)}），请重试`,
          confidence: result.confidence,
        },
        { status: 401 }
      )
    }

    // 通过 face_token 找到对应用户
    const user = db.getUserByFaceToken(result.faceToken)
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未找到匹配用户，请先注册' },
        { status: 401 }
      )
    }

    // 设置 Session
    await setSession({ userId: user.id, name: user.name, email: user.email })

    return NextResponse.json({
      success: true,
      confidence: result.confidence,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err: any) {
    console.error('[face-login]', err)
    const msg =
      err.message === 'NO_FACE_DETECTED' ? '未检测到人脸，请靠近摄像头' :
      err.message === 'MULTIPLE_FACES'   ? '检测到多张人脸，请确保画面中只有你' :
      err.message === 'IMAGE_TOO_BLURRY' ? '图像太模糊，请保持稳定' :
      '服务错误，请稍后重试'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
