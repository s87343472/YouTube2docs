import { Pool } from 'pg'
import Redis from 'ioredis'

// PostgreSQL connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'youtube_learning',
  user: process.env.DB_USER || 'sagasu',
  password: process.env.DB_PASSWORD || '',
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
  let client = null
  try {
    // Test PostgreSQL with timeout
    console.log('🔍 Testing PostgreSQL connection...')
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]) as any
    
    const result = await client.query('SELECT current_database(), current_user')
    console.log(`✅ PostgreSQL connected successfully to ${result.rows[0].current_database}`)
    client.release()

    // Test Redis
    console.log('🔍 Testing Redis connection...')
    await redis.ping()
    console.log('✅ Redis connected successfully')

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    if (client) {
      try {
        client.release()
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError)
      }
    }
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