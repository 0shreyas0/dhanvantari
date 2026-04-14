import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

let prisma: PrismaClient

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter })
} else {
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  
  // Re-create client if it's stale (doesn't have the new model)
  if (globalForPrisma.prisma && !('expirySettings' in globalForPrisma.prisma)) {
    console.log("Stale Prisma Client detected, recreating...")
    delete (globalForPrisma as any).prisma
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
