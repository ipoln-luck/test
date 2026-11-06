export function createPlantAlarmsRepository(database) {
  return {
    async acknowledgeByPlant(plantId, alarmIds, acknowledgedBy) {
      const { rows } = await database.query(
        `UPDATE "alarms"
         SET "isAcknowledged" = TRUE,
             "acknowledgedAt" = NOW(),
             "acknowledgedBy" = $3
         WHERE "plantId" = $1
           AND "alarmId" = ANY($2::varchar[])
         RETURNING "alarmId"`,
        [plantId, alarmIds, acknowledgedBy],
      );

      return {
        acknowledgedCount: rows.length,
        acknowledgedAlarmIds: rows.map((row) => row.alarmId),
      };
    },
    async findByPlant(plantId, filters = {}) {
      const {
        severity,
        status,
        q,
        startDate,
        endDate,
        page = 1,
      } = filters;

      const currentPage = Math.max(Number(page) || 1, 1);

      const limit = 10

      const offset = (currentPage - 1) * limit;

      const values = [plantId];
      const conditions = ['"plantId" = $1'];

      const addParam = (value) => {
        values.push(value);
        return `$${values.length}`;
      };

      if (severity !== undefined) {
        conditions.push(`"severity" = ${addParam(severity)}`);
      }

      if (status !== undefined) {
        conditions.push(`"status" = ${addParam(status)}`);
      }

      if (q !== undefined) {
        conditions.push(`"message" ILIKE ${addParam(`%${q}%`)}`);
      }

      // overlap -> alarm was active at any point in [startDate, endDate)
      // clearTime >= startDate removes alarms that ended before your window
      //  startTime < endDate removes alarms that began after your window
      // Returns every alarm that was raised, cleared, or still unresolved at any time within the selected date range, including alarms that were already active before the range began and remained active through it.
      if (startDate !== undefined) {
        conditions.push(
          `("clearTime" IS NULL OR "clearTime" >= ${addParam(startDate)})`
        );
      }

      if (endDate !== undefined) {
        conditions.push(`"startTime" < ${addParam(endDate)}`);
      }

      const whereClause = conditions.join(" AND ");

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM "alarms"
        WHERE ${whereClause}
      `;

      const dataValues = [...values, limit, offset];

      const dataQuery = `
        SELECT *
        FROM "alarms"
        WHERE ${whereClause}
        ORDER BY "startTime" DESC, "alarmId" DESC
        LIMIT $${dataValues.length - 1}
        OFFSET $${dataValues.length}
      `;

      const [countResult, dataResult] = await Promise.all([
        database.query(countQuery, values),
        database.query(dataQuery, dataValues),
      ]);

      const total = Number(countResult.rows[0].total);

      return {
        alarms: dataResult.rows,
        pagination: {
          total,
          currentPage,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    async getKpiByPlant(plantId, filters = {}) {
      const { startDate, endDate } = filters;

      const values = [plantId];
      const conditions = ['"plantId" = $1'];

      const addParam = (value) => {
        values.push(value);
        return `$${values.length}`;
      };

      if (startDate !== undefined) {
        conditions.push(
          `("clearTime" IS NULL OR "clearTime" >= ${addParam(startDate)})`
        );
      }

      if (endDate !== undefined) {
        conditions.push(
          `"startTime" < ${addParam(endDate)}`
        );
      }

      const query = `
    WITH filtered_alarms AS (
      SELECT *
      FROM "alarms"
      WHERE ${conditions.join(" AND ")}
    ),
    overall AS (
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "severity" = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE "severity" = 'warning')::int AS warning,
        COUNT(*) FILTER (WHERE "severity" = 'info')::int AS info,

        AVG(EXTRACT(EPOCH FROM ("acknowledgedAt" - "startTime")))
          AS avg_acknowledge_time,

        AVG(EXTRACT(EPOCH FROM ("clearTime" - "startTime")))
          AS avg_clear_time

      FROM filtered_alarms
    ),
    by_device AS (
      SELECT "deviceId", COUNT(*)::int AS count
      FROM filtered_alarms
      GROUP BY "deviceId"
    )
    SELECT
      overall.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'deviceId', "deviceId",
              'count', count
            )
            ORDER BY count DESC
          )
          FROM by_device
        ),
        '[]'::json
      ) AS by_device
    FROM overall;
  `;

      const { rows } = await database.query(query, values);

      const row = rows[0];

      return {
        total: row.total,
        bySeverity: {
          critical: row.critical,
          warning: row.warning,
          info: row.info
        },
        byDevice: row.by_device,
        avgAcknowledgeTime: row.avg_acknowledge_time,
        avgClearTime: row.avg_clear_time
      };
    },
    async getAlarmTrendCounts(plantId, {
      todayStart,
      nowUtc,
      yesterdayStart,
      sameTimeYesterday,
      dayBeforeStart,
    }) {
      //  $2–$3  today:            [todayStart,      now)             → today's count
      //  $4–$5  yesterday_so_far: [yesterdayStart,  sameTimeYest)    → baseline for today's %Δ (time-by-time)
      //  $4–$2  yesterday_full:   [yesterdayStart,  todayStart)      → yesterday's full-day count
      //  $6–$4  daybefore_full:   [dayBeforeStart,  yesterdayStart)  → baseline for yesterday's %Δ (full day)
      const query = `
        SELECT
          COUNT(*) FILTER (
            WHERE "startTime" >= $2::timestamptz
              AND "startTime" <  $3::timestamptz
          )::int AS today,

          COUNT(*) FILTER (
            WHERE "startTime" >= $4::timestamptz
              AND "startTime" <  $5::timestamptz
          )::int AS yesterday_so_far,

          COUNT(*) FILTER (
            WHERE "startTime" >= $4::timestamptz
              AND "startTime" <  $2::timestamptz
          )::int AS yesterday_full,

          COUNT(*) FILTER (
            WHERE "startTime" >= $6::timestamptz
              AND "startTime" <  $4::timestamptz
          )::int AS daybefore_full

        FROM "alarms"
        WHERE "plantId" = $1
          AND "startTime" >= $6::timestamptz
          AND "startTime" <  $3::timestamptz
      `;

      const values = [
        plantId,          // $1
        todayStart,       // $2
        nowUtc,           // $3
        yesterdayStart,   // $4
        sameTimeYesterday,// $5
        dayBeforeStart,   // $6
      ];

      const { rows } = await database.query(query, values);
      return rows[0];
    },
    async getReportByPlant(plantId, { startDate, endDate }) {
      const BATCH_SIZE = 500;
      const MAX_BATCHES = 4;
      const metaResult = await database.query(
        `SELECT
           id          AS plant_id,
           customer_id,
           site_name,
           state,
           country
         FROM "plants"
         WHERE id = $1`,
        [plantId],
      );
      const meta = metaResult.rows[0] ?? {};
      const alarms = [];
      let offset = 0;

      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const { rows } = await database.query(
          `SELECT *
           FROM "alarms"
           WHERE "plantId" = $1
             AND "startTime" >= $2::timestamptz
             AND "startTime" <  $3::timestamptz
           ORDER BY "startTime" DESC, "alarmId" DESC
           LIMIT $4 OFFSET $5`,
          [plantId, startDate, endDate, BATCH_SIZE, offset],
        );

        alarms.push(...rows);
        if (rows.length < BATCH_SIZE) break;
        offset += BATCH_SIZE;
      }

      return { meta, alarms };
    },
  };

}
