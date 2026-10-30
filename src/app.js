import Fastify from "fastify";
import cors from "@fastify/cors"
import fastifyEnv from "@fastify/env";
import { envSchema } from "./config/env.config.js";
import { registerErrorHandler } from "./plugins/error.plugin.js"
import { successResponse } from "./utils/api-response.utils.js";

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    app.register(fastifyEnv, {
        schema: envSchema,
        dotenv: true,
    });

    registerErrorHandler(app)

    app.register(cors, {
        origin: (_origin, callback) => callback(null, app.config.CORS_ORIGIN),
    })

    app.get("/", async (request, reply) => {
        reply.code(200);
        return successResponse({hello:"world"},"success")
    });

    return app;
}
