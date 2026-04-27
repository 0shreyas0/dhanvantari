import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Adding isCompleted column to Batch table...')
    await prisma.$executeRawUnsafe('ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN DEFAULT FALSE')
    console.log('Success!')
  } catch (e) {
    console.error('Failed to add column:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
