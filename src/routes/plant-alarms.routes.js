import { createPlantAlarmsController } from "../controllers/plant-alarms.controller.js";
import { createPlantAlarmsService } from "../services/plant-alarms.service.js";
import { createPlantAlarmsRepository } from "../repositories/plant-alarms.repository.js";

const plantIdSchema = {
  type: "string",
  pattern: "^[1-9][0-9]*$",
};

const alarmsQuerystringSchema = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["critical", "warning", "info"] },
    status: { type: "string", enum: ["active", "cleared"] },
    q: { type: "string" },
    startDate: { type: "string", format: "date" },
    endDate: { type: "string", format: "date" },
    page: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
};

const kpisQuerystringSchema = {
  type: "object",
  properties: {
    startDate: { type: "string", format: "date" },
    endDate: { type: "string", format: "date" },
  },
  additionalProperties: false,
};

const reportQuerystringSchema = {
  type: "object",
  required: ["startDate", "endDate"],
  properties: {
    startDate: { type: "string", format: "date" },
    endDate: { type: "string", format: "date" },
  },
  additionalProperties: false,
};

const acknowledgeBodySchema = {
  type: "object",
  required: ["alarmIds"],
  properties: {
    alarmIds: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
  additionalProperties: false,
};

export async function registerPlantAlarmRoutes(app) {
  const repository = createPlantAlarmsRepository(app.pg);
  const service = createPlantAlarmsService(repository);
  const controller = createPlantAlarmsController(service);

  app.get(
    "/api/plant/:id/alarms",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: plantIdSchema },
          additionalProperties: false,
        },
        querystring: alarmsQuerystringSchema,
      },
    },
    controller.getPlantAlarms,
  );
  app.get(
    "/api/plant/:id/alarms/kpis",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: plantIdSchema },
          additionalProperties: false,
        },
        querystring: kpisQuerystringSchema,
      },
    },
    controller.getPlantKpis,
  );
  app.get(
    "/api/plant/:id/alarms/report",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: plantIdSchema },
          additionalProperties: false,
        },
        querystring: reportQuerystringSchema,
      },
    },
    controller.getPlantAlarmReport,
  );
  app.get(
    "/api/plant/:id/alarms/trends",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: plantIdSchema },
          additionalProperties: false,
        },
      },
    },
    controller.getPlantAlarmTrends,
  );
  app.patch(
    "/api/plant/:id/alarms/acknowledge",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: plantIdSchema },
          additionalProperties: false,
        },
        body: acknowledgeBodySchema,
      },
    },
    controller.acknowledgePlantAlarms,
  );
}
