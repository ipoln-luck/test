
import postgres from "@fastify/postgres";

export async function registerPostgres(app) {
  await app.register(postgres, {
    connectionString: app.config.POSTGRES_DATABASE_URL,
  });

  try {
    await app.pg.query("SELECT 1");

    app.log.info("PostgreSQL connected successfully");
  } catch (error) {
    app.log.error(
      { err: error },
      "PostgreSQL connection failed"
    );

    throw error;
  }
}
