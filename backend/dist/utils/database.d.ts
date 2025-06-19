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
}
//# sourceMappingURL=database.d.ts.map