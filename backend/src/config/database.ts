import { Pool } from 'pg'
import Redis from 'ioredis'

// PostgreSQL connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Redis connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true
})

// Database connection test
export async function testDatabaseConnection() {
  try {
    // Test PostgreSQL
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ PostgreSQL connected successfully')

    // Test Redis
    await redis.ping()
    console.log('✅ Redis connected successfully')

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  try {
    await pool.end()
    redis.disconnect()
    console.log('🔌 Database connections closed')
  } catch (error) {
    console.error('❌ Error closing database connections:', error)
  }
}