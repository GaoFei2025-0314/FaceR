// lib/facepp.ts
// Face++ API 封装

const API_KEY = process.env.FACEPP_API_KEY!
const API_SECRET = process.env.FACEPP_API_SECRET!
const BASE_URL = 'https://api-cn.faceplusplus.com/facepp/v3'

async function request(path: string, params: Record<string, string>) {
  const form = new FormData()
  form.append('api_key', API_KEY)
  form.append('api_secret', API_SECRET)
  for (const [k, v] of Object.entries(params)) {
    form.append(k, v)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: form,
  })

  const data = await res.json()
  if (data.error_message) {
    throw new Error(data.error_message)
  }
  return data
}

/** 检测图片中的人脸，返回 face_token */
export async function detectFace(imageBase64: string): Promise<string> {
  const data = await request('/detect', {
    image_base64: imageBase64,
    return_attributes: 'blur,headpose',
  })

  if (!data.faces || data.faces.length === 0) {
    throw new Error('NO_FACE_DETECTED')
  }
  if (data.faces.length > 1) {
    throw new Error('MULTIPLE_FACES')
  }

  const face = data.faces[0]

  // 检查模糊度，blurness > 50 代表太模糊
  const blur = face.attributes?.blur?.blurness?.value ?? 0
  if (blur > 60) {
    throw new Error('IMAGE_TOO_BLURRY')
  }

  return face.face_token as string
}

/** 创建人脸库（FaceSet），首次初始化调用一次 */
export async function createFaceset(name: string) {
  return request('/faceset/create', {
    display_name: name,
    outer_id: `faceset_${Date.now()}`,
  })
}

/** 把 face_token 加入 FaceSet */
export async function addFaceToSet(faceToken: string, facesetToken: string) {
  return request('/faceset/addface', {
    faceset_token: facesetToken,
    face_tokens: faceToken,
  })
}

/** 从 FaceSet 中删除人脸（注销时使用） */
export async function removeFaceFromSet(faceToken: string, facesetToken: string) {
  return request('/faceset/removeface', {
    faceset_token: facesetToken,
    face_tokens: faceToken,
  })
}

export interface SearchResult {
  faceToken: string
  confidence: number
  /** Face++ 推荐阈值 */
  thresholds: {
    '1e-3': number
    '1e-4': number
    '1e-5': number
  }
}

/** 在 FaceSet 中搜索最匹配的人脸，返回 null 代表无匹配 */
export async function searchFace(
  imageBase64: string,
  facesetToken: string
): Promise<SearchResult | null> {
  let data: Record<string, any>
  try {
    data = await request('/search', {
      image_base64: imageBase64,
      faceset_token: facesetToken,
      return_result_count: '1',
    })
  } catch (err: any) {
    // Face++ 搜索时检测不到人脸会报错
    if (err.message?.includes('NO_FACE')) return null
    throw err
  }

  if (!data.results || data.results.length === 0) return null

  return {
    faceToken: data.results[0].face_token,
    confidence: data.results[0].confidence,
    thresholds: data.thresholds,
  }
}
