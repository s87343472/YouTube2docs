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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
const fastify = (0, fastify_1.default)({
    logger: {
        level: process.env.NODE_ENV === 'development' ? 'info' : 'warn'
    }
});
// Register plugins
async function registerPlugins() {
    // CORS configuration
    await fastify.register(cors_1.default, {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true
    });
    // Multipart form data support
    await fastify.register(multipart_1.default, {
        limits: {
            fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB
        }
    });
    // Static files
    const uploadsPath = path_1.default.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads');
    await fastify.register(static_1.default, {
        root: uploadsPath,
        prefix: '/uploads/'
    });
}
// Register routes
async function registerRoutes() {
    // Health check
    fastify.get('/health', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        };
    });
    // API routes prefix
    await fastify.register(async function (fastify) {
        // Import and register video routes
        const { videoRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/videoRoutes')));
        await fastify.register(videoRoutes);
        // Auth routes (placeholder)
        fastify.get('/auth/me', async (request, reply) => {
            return {
                message: 'Auth endpoint - coming soon',
                user: null,
                authenticated: false
            };
        });
        // System info
        fastify.get('/system/info', async (request, reply) => {
            return {
                status: 'ok',
                version: '1.0.0',
                features: {
                    audioProcessing: true,
                    transcription: true,
                    contentAnalysis: true,
                    knowledgeGraphs: true // 已实现
                },
                timestamp: new Date().toISOString()
            };
        });
    }, { prefix: '/api' });
}
// Error handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    reply.status(statusCode).send({
        error: {
            statusCode,
            message,
            timestamp: new Date().toISOString()
        }
    });
});
// Not found handler
fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
        error: {
            statusCode: 404,
            message: 'Route not found',
            path: request.url
        }
    });
});
// Start server
async function start() {
    try {
        await registerPlugins();
        await registerRoutes();
        const port = parseInt(process.env.PORT || '3000');
        const host = process.env.HOST || 'localhost';
        await fastify.listen({ port, host });
        console.log(`🚀 Server running on http://${host}:${port}`);
        console.log(`📋 Health check: http://${host}:${port}/health`);
        console.log(`🔗 API docs: http://${host}:${port}/api`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});
// Start the server
start();
//# sourceMappingURL=index.js.map