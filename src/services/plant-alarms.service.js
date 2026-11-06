import { AppError } from "../utils/AppError.utils.js";
import { ERROR_CODES } from "../constants/error-codes.constants.js";
import { randomUUID } from "node:crypto";

const PLANT_TZ_OFFSET = "+05:30";

function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const toUtcIso = (s) => new Date(s).toISOString();

export function createPlantAlarmsService(repository) {
  return {
    findPlantAlarms(plantId, filters) {
      const { startDate, endDate } = filters;

      if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
        throw new AppError(
          "startDate must be less than or equal to endDate",
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }

      const rangeStartDate = startDate ?? endDate;
      const rangeEndDate = endDate ?? startDate;

      return repository.findByPlant(plantId, {
        ...filters,
        ...(rangeStartDate !== undefined && {
          startDate: toUtcIso(`${rangeStartDate}T00:00:00${PLANT_TZ_OFFSET}`),
        }),
        ...(rangeEndDate !== undefined && {
          endDate: toUtcIso(`${nextDay(rangeEndDate)}T00:00:00${PLANT_TZ_OFFSET}`),
        }),
      });
    },
    findPlantKpis(plantId, filters) {
      const { startDate, endDate } = filters;

      if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
        throw new AppError(
          "startDate must be less than or equal to endDate",
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }

      const rangeStartDate = startDate ?? endDate;
      const rangeEndDate = endDate ?? startDate;

      return repository.getKpiByPlant(plantId, {
        ...filters,
        ...(rangeStartDate !== undefined && {
          startDate: toUtcIso(`${rangeStartDate}T00:00:00${PLANT_TZ_OFFSET}`),
        }),
        ...(rangeEndDate !== undefined && {
          endDate: toUtcIso(`${nextDay(rangeEndDate)}T00:00:00${PLANT_TZ_OFFSET}`),
        }),
      });
    },
    async findPlantAlarmReport(plantId, { startDate, endDate }) {
      if (startDate > endDate) {
        throw new AppError(
          "startDate must be less than or equal to endDate",
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }

      const start = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T00:00:00Z`);
      const days = (end - start) / (24 * 60 * 60 * 1000) + 1;
      if (days > 30) {
        throw new AppError(
          "Date range must not exceed 30 days",
          400,
          ERROR_CODES.CONFLICT,
        );
      }

      return repository.getReportByPlant(plantId, {
        startDate: toUtcIso(`${startDate}T00:00:00${PLANT_TZ_OFFSET}`),
        endDate: toUtcIso(`${nextDay(endDate)}T00:00:00${PLANT_TZ_OFFSET}`),
      });
    },
    acknowledgePlantAlarms(plantId, alarmIds) {
      return repository.acknowledgeByPlant(plantId, alarmIds, randomUUID());
    },

    async findPlantAlarmTrends(plantId) {
      // Current moment in plant local time (UTC+05:30)
      const TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms

      const nowUtc = new Date();
      const nowLocal = new Date(nowUtc.getTime() + TZ_OFFSET_MS);

      // Local midnight of today (plant tz) → UTC
      const todayLocalMidnight = new Date(
        Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate())
      );
      const todayStartUtc = new Date(todayLocalMidnight.getTime() - TZ_OFFSET_MS);

      // Yesterday local midnight → UTC
      const yesterdayStartUtc = new Date(todayStartUtc.getTime() - 24 * 60 * 60 * 1000);

      // Day-before-yesterday local midnight → UTC
      const dayBeforeYesterdayStartUtc = new Date(yesterdayStartUtc.getTime() - 24 * 60 * 60 * 1000);

      // Elapsed ms since local midnight (how far into today we are)
      const elapsedMs = nowUtc.getTime() - todayStartUtc.getTime();

      // "Same time yesterday" = yesterday start + same elapsed time
      const sameTimeYesterdayUtc = new Date(yesterdayStartUtc.getTime() + elapsedMs);

      /*
       * Periods needed:
       *  - today:            [todayStart,       now)              → "today count"
       *  - yesterday_so_far: [yesterdayStart,   sameTimeYest)     → baseline for today's change (time-by-time)
       *  - yesterday_full:   [yesterdayStart,   todayStart)       → "yesterday count" (full day)
       *  - daybefore_full:   [dayBeforeStart,   yesterdayStart)   → baseline for yesterday's change (full day)
       */
      const counts = await repository.getAlarmTrendCounts(plantId, {
        todayStart: todayStartUtc.toISOString(),
        nowUtc: nowUtc.toISOString(),
        yesterdayStart: yesterdayStartUtc.toISOString(),
        sameTimeYesterday: sameTimeYesterdayUtc.toISOString(),
        dayBeforeStart: dayBeforeYesterdayStartUtc.toISOString(),
      });

      const todayCount = counts.today;
      const yesterdaySoFarCount = counts.yesterday_so_far;
      const yesterdayFullCount = counts.yesterday_full;
      const dayBeforeFullCount = counts.daybefore_full;

      return {
        today: {
          count: todayCount,
          change: todayCount - yesterdaySoFarCount,
          comparedTo: "yesterday (same elapsed time)",
        },
        yesterday: {
          count: yesterdayFullCount,
          change: yesterdayFullCount - dayBeforeFullCount,
          comparedTo: "day before yesterday (full day)",
        },
      };
    },
  };
}
