import { NextResponse } from 'next/server'
import { detectFace, addFaceToSet, createFaceset } from '@/lib/facepp'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { name, email, imageBase64 } = await req.json()

    if (!name || !email || !imageBase64) {
      return NextResponse.json({ success: false, message: '参数不完整' }, { status: 400 })
    }

    // 确保 FaceSet 存在（第一次注册时自动创建）
    let facesetToken = db.getFacesetToken()
    if (!facesetToken) {
      const result = await createFaceset('face_login_users')
      const createdFacesetToken = result.faceset_token
      if (!createdFacesetToken) {
        return NextResponse.json(
          { success: false, message: 'FaceSet 创建失败，请检查 API 密钥' },
          { status: 500 }
        )
      }
      facesetToken = createdFacesetToken
      db.setFacesetToken(createdFacesetToken)
      console.log('[face-register] Created FaceSet:', facesetToken)
    }

    // 调用 Face++ 检测人脸，获取 face_token
    const faceToken = await detectFace(imageBase64)

    // 将人脸加入 FaceSet
    if (!facesetToken) {
      return NextResponse.json(
        { success: false, message: 'FaceSet 初始化失败，请重试' },
        { status: 500 }
      )
    }
    await addFaceToSet(faceToken, facesetToken)

    // 存入数据库
    const user = db.createUser({ name, email, faceToken })

    console.log('[face-register] Registered user:', user.id, name)

    return NextResponse.json({
      success: true,
      userId: user.id,
      faceToken,
      message: '注册成功',
    })
  } catch (err: any) {
    console.error('[face-register]', err)
    const msg =
      err.message === 'NO_FACE_DETECTED' ? '未检测到人脸，请正对摄像头' :
      err.message === 'MULTIPLE_FACES'   ? '检测到多张人脸，请确保画面中只有你' :
      err.message === 'IMAGE_TOO_BLURRY' ? '图像太模糊，请保持稳定并确保光线充足' :
      `错误：${err.message}`
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
