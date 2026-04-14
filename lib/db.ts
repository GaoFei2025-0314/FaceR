// lib/db.ts
// 基于 JSON 文件的简易数据库（仅用于测试，生产环境换成真实数据库）

import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

export interface User {
  id: string
  name: string
  email: string
  faceToken: string
  createdAt: string
}

export interface DB {
  facesetToken: string | null
  users: User[]
}

function read(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { facesetToken: null, users: [] }
  }
}

function write(db: DB) {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

export const db = {
  getFacesetToken(): string | null {
    return read().facesetToken
  },

  setFacesetToken(token: string) {
    const data = read()
    data.facesetToken = token
    write(data)
  },

  getUsers(): User[] {
    return read().users
  },

  getUserByFaceToken(faceToken: string): User | null {
    return read().users.find(u => u.faceToken === faceToken) ?? null
  },

  getUserById(id: string): User | null {
    return read().users.find(u => u.id === id) ?? null
  },

  createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const data = read()
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date().toISOString(),
    }
    data.users.push(newUser)
    write(data)
    return newUser
  },
}
