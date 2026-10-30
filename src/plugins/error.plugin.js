
import { AppError } from "../utils/AppError.utils.js";
import { errorResponse } from "../utils/api-response.utils.js";
import { ERROR_CODES } from "../constants/error-codes.constants.js";

export function registerErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        const isDev = app.config.NODE_ENV === "development";

        request.log.error({ err: error }, "Request failed");

        // vaildation error by fastify schema  rules 
        if (error.validation) {
            const details = error.validation.map((item) => ({
                field: item.instancePath ||
                    item.params?.missingProperty ||
                    error.validationContext,
                message: item.message,
            }));

            return reply.code(400).send(
                errorResponse(
                    "Validation failed",
                    ERROR_CODES.VALIDATION_ERROR,
                    details
                )
            );
        }

        //  error thrown by us 
        if (error instanceof AppError) {
            return reply.code(error.statusCode).send(
                errorResponse(
                    error.message,
                    error.code,
                    error.details
                )
            );
        }

        // unexpected errors
        return reply.code(500).send(
            errorResponse(
                isDev ? error.message : "Internal Server Error",
                ERROR_CODES.INTERNAL_SERVER_ERROR,
                null
            )
        );
    });

    app.setNotFoundHandler((request, reply) => {
        return reply.code(404).send(
            errorResponse("Route not found", ERROR_CODES.NOT_FOUND)
        );
    });
}
