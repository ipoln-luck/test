# icloudx-api

Backend API built with Fastify and PostgreSQL. This guide describes the project conventions for contributors and coding agents adding or changing API features.

## Tech stack

- Node.js (ES modules)
- Fastify 5 for the HTTP server
- PostgreSQL, using `pg` through `@fastify/postgres`
- `node-pg-migrate` for database schema migrations
- `@fastify/swagger` and `@fastify/swagger-ui` for API documentation

## Extending the project

As the API grows, add libraries, shared code, folders, or commands when they help support the change:

- Add a dependency with npm and commit the updated `package.json` and `package-lock.json`. Prefer a focused dependency that fits the layer where it will be used.
- Put reusable code in a shared folder that reflects its purpose, such as `utils/`, `constants/`, `plugins/`, or `integrations/`. Keep feature-specific logic with that feature. Add a clearly named folder under `src/` if a new shared category is needed.
- Put repeatable commands in `package.json` under `scripts`. When adding or changing a command, update the scripts list in this guide with its purpose and any required arguments or configuration.
- Put runtime configuration in environment variables and document new variables in `.env.example` and `src/config/env.config.js`, as described below.

## Getting started

Install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env
```

Set `POSTGRES_DATABASE_URL` in `.env` to a connection string for your PostgreSQL database. The app requires this variable, along with `PORT` and `NODE_ENV`. `CORS_ORIGIN` is optional and defaults to `http://localhost:5173`.

Start the development server with:

```sh
npm run dev
```

The server listens on the configured `PORT` (the example uses port 8000). Use `npm start` to start without file watching.

## Adding an API feature or route

Keep HTTP handling, business rules, and database access in separate layers:

```text
routes → controllers → services → repositories → PostgreSQL
```

For a new feature, follow these steps:

1. **Repository** (`src/repositories/`): implement database reads and writes. Accept the database client as a dependency, use parameterized SQL values, and return data rather than HTTP responses.
2. **Service** (`src/services/`): implement business rules and coordinate repository calls. Keep Fastify request/reply objects out of this layer. Use `AppError` and shared error codes for expected application errors.
3. **Controller** (`src/controllers/`): adapt Fastify requests to service calls and translate results into HTTP responses. Use `successResponse` for successful responses; let the registered error handler handle thrown errors.
4. **Routes** (`src/routes/`): define endpoints and Fastify JSON schemas for params, query strings, and request bodies. Create the repository, service, and controller with their dependencies, then register the handlers on the Fastify app.
5. **Register the routes** in `src/app.js` (or register a feature plugin from there) so the endpoints are mounted when the app is built.
6. **Describe inputs and outputs** with Fastify JSON schemas for validation and consistent endpoint definitions.
7. If the feature needs a database schema change, create and apply a migration as described below. Add environment configuration only if the feature needs new configuration.

Feature files are grouped by layer at present; use consistent kebab-case names such as `widgets.routes.js`, `widgets.controller.js`, `widgets.service.js`, and `widgets.repository.js`. A feature without persistence can omit the repository. Avoid adding layers that do no useful work.

Before finishing a change, check that route schemas describe accepted input, SQL values are parameterized, responses and errors follow the shared helpers, and routes are registered. Add or update tests when suitable coverage exists for the behavior.

## Environment variables

When adding an environment variable:

1. Add it to `.env` for your local development value. Add a safe example/default entry to `.env.example` so other developers know what to configure. Do not commit secrets.
2. Add its type, default (if appropriate), and required status to the schema in `src/config/env.config.js`.
3. Read it from `app.config` in application code. Fastify's env plugin validates the configuration during app startup.

## Database migrations

Create a migration first, then review and edit the generated file in `migrations/` to define its `up` and `down` changes. Apply migrations only after the database URL is configured in `.env`:

```sh
npm run migrate:create -- create-your-change-name
npm run migrate:up
```

`migrate:up` applies pending migrations in order. To roll back the most recently applied migration, run:

```sh
npm run migrate:down
```

Write the corresponding reverse operation in each migration's `down` function. For schema changes, add a new migration rather than editing a migration that has already been applied in a shared environment.

## Package scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with Node.js watch mode. |
| `npm start` | Start the server normally. |
| `npm run migrate:create -- <name>` | Generate a migration file with the given name. |
| `npm run migrate:up` | Apply pending migrations using `POSTGRES_DATABASE_URL` from `.env`. |
| `npm run migrate:down` | Roll back the most recently applied migration. |

## Project structure

```text
migrations/              PostgreSQL schema migrations
src/
  config/                Environment variable schema and configuration
  constants/             Shared constants, including error codes
  controllers/           HTTP request handlers
  integrations/          External service integrations (currently PostgreSQL)
  plugins/               Fastify plugins (errors and Swagger)
  repositories/          Database queries and persistence
  routes/                Route registration and endpoint definitions
  services/              Application and business logic
  utils/                 Shared response and error helpers
  app.js                 Fastify app construction and plugin/route registration
  server.js              Server startup and listen configuration
```

Feature files are grouped by layer rather than by feature directory. Shared behavior belongs in the shared folders such as `plugins/`, `utils/`, and `constants/`.
