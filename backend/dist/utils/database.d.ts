export declare class DatabaseManager {
    /**
     * 运行数据库迁移
     */
    static runMigrations(): Promise<void>;
    /**
     * 运行种子数据
     */
    static runSeeds(): Promise<void>;
    /**
     * 重置数据库
     */
    static resetDatabase(): Promise<void>;
    /**
     * 检查数据库连接和基本功能
     */
    static healthCheck(): Promise<{
        status: string;
        timestamp: any;
        postgresql_version: any;
        tables_count: number;
        missing_tables: string[];
        all_tables_exist: boolean;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp?: undefined;
        postgresql_version?: undefined;
        tables_count?: undefined;
        missing_tables?: undefined;
        all_tables_exist?: undefined;
    }>;
    /**
     * 获取数据库统计信息
     */
    static getStats(): Promise<any>;
    /**
     * 检查Redis是否可用
     */
    static isRedisAvailable(): boolean;
    /**
     * 获取Redis连接
     */
    static getRedisConnection(): Promise<import("ioredis").default>;
    /**
     * Redis健康检查
     */
    static redisHealthCheck(): Promise<{
        status: string;
        response_time: number;
        connection_status: "close" | "connect" | "wait" | "reconnecting" | "connecting" | "ready" | "end";
        memory_usage: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        connection_status: "close" | "connect" | "wait" | "reconnecting" | "connecting" | "ready" | "end";
        response_time?: undefined;
        memory_usage?: undefined;
    }>;
}
//# sourceMappingURL=database.d.ts.map