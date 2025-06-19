import { Pool } from 'pg';
import Redis from 'ioredis';
export declare const pool: Pool;
export declare const redis: Redis;
export declare function testDatabaseConnection(): Promise<boolean>;
export declare function closeDatabaseConnections(): Promise<void>;
//# sourceMappingURL=database.d.ts.map