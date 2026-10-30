export const envSchema = {
  type: "object",
  required: ["PORT", "NODE_ENV","POSTGRES_DATABASE_URL"],
  properties: {
    PORT: {
      type: "number",
      default: 3000,
    },
    NODE_ENV:{
        type:"string",
        default:"development"
    },
    CORS_ORIGIN: {
      type: "string",
      default: "http://localhost:5173",
    },
    POSTGRES_DATABASE_URL: {
      type: "string",
    },
  },
};
