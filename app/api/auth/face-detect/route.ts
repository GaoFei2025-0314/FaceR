import { NextResponse } from 'next/server'
import { detectFace } from '@/lib/facepp'

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, message: '缺少图像数据' }, { status: 400 })
    }

    // 先检测是否有人脸
    const faceToken = await detectFace(imageBase64)

    return NextResponse.json({
      success: true,
      faceToken,
      message: '检测到人脸'
    })
  } catch (err: any) {
    console.error('[face-detect]', err)
    const msg =
      err.message === 'NO_FACE_DETECTED' ? '未检测到人脸，请正对摄像头' :
      err.message === 'MULTIPLE_FACES'   ? '检测到多张人脸，请确保画面中只有你' :
      err.message === 'IMAGE_TOO_BLURRY' ? '图像太模糊，请保持稳定' :
      `错误：${err.message}`
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}