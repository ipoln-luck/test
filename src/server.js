import { buildApp } from "./app.js";

const app = buildApp();

try {
  await app.ready();

  await app.listen({
    port: app.config.PORT,
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
