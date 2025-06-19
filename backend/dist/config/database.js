"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.pool = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
exports.closeDatabaseConnections = closeDatabaseConnections;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
// PostgreSQL connection
exports.pool = new pg_1.Pool({
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
});
// Redis connection
exports.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true
});
// Database connection test
async function testDatabaseConnection() {
    let client = null;
    try {
        // Test PostgreSQL with timeout
        console.log('🔍 Testing PostgreSQL connection...');
        client = await Promise.race([
            exports.pool.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
        ]);
        const result = await client.query('SELECT current_database(), current_user');
        console.log(`✅ PostgreSQL connected successfully to ${result.rows[0].current_database}`);
        client.release();
        // Test Redis
        console.log('🔍 Testing Redis connection...');
        await exports.redis.ping();
        console.log('✅ Redis connected successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        if (client) {
            try {
                client.release();
            }
            catch (releaseError) {
                console.error('Error releasing client:', releaseError);
            }
        }
        return false;
    }
}
// Graceful shutdown
async function closeDatabaseConnections() {
    try {
        await exports.pool.end();
        exports.redis.disconnect();
        console.log('🔌 Database connections closed');
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
}
//# sourceMappingURL=database.js.map