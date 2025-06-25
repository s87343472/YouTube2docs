"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./errors/errorHandler");
// import { loggingMiddleware } from './middleware/logging' // temporarily disabled
// import { rateLimitMiddleware } from './middleware/rateLimit' // temporarily disabled
// Validate configuration on startup
(0, config_1.validateConfig)();
// Setup process-level error handlers
errorHandler_1.errorHandling.setupProcessHandlers();
const fastify = (0, fastify_1.default)({
    logger: false, // We'll use our custom logger
    trustProxy: true,
    disableRequestLogging: true // We handle this with our middleware
});
// Register plugins
async function registerPlugins() {
    logger_1.logger.info('Registering Fastify plugins...', undefined, {}, logger_1.LogCategory.SERVER);
    // CORS configuration
    if (config_1.config.security.enableCors) {
        await fastify.register(cors_1.default, {
            origin: config_1.config.server.corsOrigin,
            credentials: true
        });
        logger_1.logger.info('CORS plugin registered', undefined, { metadata: { origin: config_1.config.server.corsOrigin } }, logger_1.LogCategory.SERVER);
    }
    // Request correlation and logging (must be first) - temporarily disabled
    // for (const middleware of loggingMiddleware.core) {
    //   fastify.addHook('preHandler', middleware)
    // }
    logger_1.logger.info('Logging middleware registered', undefined, {}, logger_1.LogCategory.SERVER);
    // Rate limiting (if enabled) - temporarily disabled due to TypeScript issues
    // if (config.security.enableRateLimit) {
    //   fastify.addHook('preHandler', rateLimitMiddleware.global)
    //   logger.info('Rate limiting enabled', undefined, {
    //     metadata: {
    //       window: config.security.rateLimitWindow,
    //       max: config.security.rateLimitMax
    //     }
    //   }, LogCategory.SERVER)
    // }
    // Multipart form data support
    await fastify.register(multipart_1.default, {
        limits: {
            fileSize: config_1.config.server.maxFileSize
        }
    });
    logger_1.logger.info('Multipart plugin registered', undefined, { metadata: { maxFileSize: config_1.config.server.maxFileSize } }, logger_1.LogCategory.SERVER);
    // Static files
    const uploadsPath = path_1.default.resolve(process.cwd(), config_1.config.server.uploadPath);
    await fastify.register(static_1.default, {
        root: uploadsPath,
        prefix: '/uploads/'
    });
    logger_1.logger.info('Static files plugin registered', undefined, { metadata: { uploadsPath } }, logger_1.LogCategory.SERVER);
}
// Register routes
async function registerRoutes() {
    logger_1.logger.info('Registering API routes...', undefined, {}, logger_1.LogCategory.SERVER);
    // Health check with comprehensive monitoring
    fastify.get('/health', async (request, reply) => {
        try {
            // TODO: Add database health check
            // TODO: Add Redis health check
            // TODO: Add external service health checks
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config_1.config.server.nodeEnv,
                version: '1.0.0',
                services: {
                    database: 'unknown', // Will be implemented
                    redis: 'unknown', // Will be implemented
                    external: 'unknown' // Will be implemented
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Health check failed', error, {}, logger_1.LogCategory.SERVER);
            reply.code(503);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    });
    // API routes prefix
    await fastify.register(async function (fastify) {
        // Import and register video routes
        const { videoRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/videoRoutes')));
        await fastify.register(videoRoutes);
        logger_1.logger.info('Video routes registered', undefined, {}, logger_1.LogCategory.SERVER);
        // Import and register share routes
        const { shareRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/shareRoutes')));
        await fastify.register(shareRoutes);
        logger_1.logger.info('Share routes registered', undefined, {}, logger_1.LogCategory.SERVER);
        // Import and register user routes
        const { userRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/userRoutes')));
        await fastify.register(userRoutes);
        logger_1.logger.info('User routes registered', undefined, {}, logger_1.LogCategory.SERVER);
        // Import and register concept routes - temporarily disabled
        // const { conceptRoutes } = await import('./routes/conceptRoutes')
        // await fastify.register(conceptRoutes)
        // logger.info('Concept routes registered', undefined, {}, LogCategory.SERVER)
        // Import and register export routes - temporarily disabled
        // const { exportRoutes } = await import('./routes/exportRoutes')
        // await fastify.register(exportRoutes)
        // logger.info('Export routes registered', undefined, {}, LogCategory.SERVER)
        // Import and register Better Auth routes
        const { betterAuthRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/betterAuthRoutes')));
        await fastify.register(betterAuthRoutes);
        logger_1.logger.info('Better Auth routes registered', undefined, {}, logger_1.LogCategory.SERVER);
        // System info with enhanced details
        fastify.get('/system/info', async (request, reply) => {
            return {
                status: 'ok',
                version: '1.0.0',
                environment: config_1.config.server.nodeEnv,
                features: {
                    audioProcessing: true,
                    transcription: true,
                    contentAnalysis: true,
                    knowledgeGraphs: true,
                    rateLimiting: config_1.config.security.enableRateLimit,
                    structuredLogging: true,
                    errorHandling: true,
                    publicSharing: true
                },
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            };
        });
    }, { prefix: '/api' });
    logger_1.logger.info('All routes registered successfully', undefined, {}, logger_1.LogCategory.SERVER);
}
// Error handlers
fastify.setErrorHandler(errorHandler_1.globalErrorHandler);
fastify.setNotFoundHandler(errorHandler_1.notFoundHandler);
// Start server
async function start() {
    try {
        logger_1.logger.info('🚀 Starting YouTube Learning Generator Backend...', undefined, {
            metadata: {
                version: '1.0.0',
                environment: config_1.config.server.nodeEnv,
                nodeVersion: process.version
            }
        }, logger_1.LogCategory.SERVER);
        await registerPlugins();
        await registerRoutes();
        await fastify.listen({
            port: config_1.config.server.port,
            host: config_1.config.server.host
        });
        logger_1.logger.info('🎉 Server started successfully', undefined, {
            metadata: {
                url: `http://${config_1.config.server.host}:${config_1.config.server.port}`,
                healthCheck: `http://${config_1.config.server.host}:${config_1.config.server.port}/health`,
                apiEndpoint: `http://${config_1.config.server.host}:${config_1.config.server.port}/api`,
                environment: config_1.config.server.nodeEnv,
                features: {
                    rateLimiting: config_1.config.security.enableRateLimit,
                    cors: config_1.config.security.enableCors,
                    structuredLogging: true,
                    errorHandling: true
                }
            }
        }, logger_1.LogCategory.SERVER);
    }
    catch (err) {
        logger_1.logger.error('❌ Failed to start server', err, {
            metadata: {
                port: config_1.config.server.port,
                host: config_1.config.server.host
            }
        }, logger_1.LogCategory.SERVER);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info('🛑 Received SIGINT, shutting down gracefully...', undefined, {}, logger_1.LogCategory.SERVER);
    try {
        await fastify.close();
        logger_1.logger.info('✅ Server shutdown completed', undefined, {}, logger_1.LogCategory.SERVER);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error during shutdown', error, {}, logger_1.LogCategory.SERVER);
        process.exit(1);
    }
});
process.on('SIGTERM', async () => {
    logger_1.logger.info('🛑 Received SIGTERM, shutting down gracefully...', undefined, {}, logger_1.LogCategory.SERVER);
    try {
        await fastify.close();
        logger_1.logger.info('✅ Server shutdown completed', undefined, {}, logger_1.LogCategory.SERVER);
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error during shutdown', error, {}, logger_1.LogCategory.SERVER);
        process.exit(1);
    }
});
// Start the server
start();
//# sourceMappingURL=index.js.map