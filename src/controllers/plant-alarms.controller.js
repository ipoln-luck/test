import { successResponse } from "../utils/api-response.utils.js";

export function createPlantAlarmsController(service) {
  return {
    async getPlantAlarms(request, reply) {
      const alarms = await service.findPlantAlarms(request.params.id, request.query);
      await new Promise((resolve) => setTimeout(resolve,   2 * 1000));  
      return reply.code(200).send(successResponse(alarms, "Plant alarms retrieved successfully"));
    },
    async getPlantKpis(request, reply) {
      const kpis = await service.findPlantKpis(request.params.id, request.query);
      await new Promise((resolve) => setTimeout(resolve,   2 * 1000));
      return reply.code(200).send(successResponse(kpis, "Plant alarms kpis retrieved successfully"));
    },
    async getPlantAlarmReport(request, reply) {
      const report = await service.findPlantAlarmReport(request.params.id, request.query);
      console.log(report.alarms.length)
      return reply.code(200).send(successResponse(report, "Plant alarm report retrieved successfully"));
    },
    async acknowledgePlantAlarms(request, reply) {
      const result = await service.acknowledgePlantAlarms(
        request.params.id,
        request.body.alarmIds,
      );
      await new Promise((resolve) => setTimeout(resolve,   2 * 1000)); 
      return reply.code(200).send(successResponse(result, "Plant alarms acknowledged successfully"));
    },
    async getPlantAlarmTrends(request, reply) {
      const trends = await service.findPlantAlarmTrends(request.params.id);
      return reply.code(200).send(successResponse(trends, "Plant alarm trends retrieved successfully"));
    },
  };
}
