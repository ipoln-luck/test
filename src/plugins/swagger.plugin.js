
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export async function registerSwagger(app) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "ICloudX API",
        description: "API documentation for ICloudX",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:8000",
          description: "Development server",
        },
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
  });
}
