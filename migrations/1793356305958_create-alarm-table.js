/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */

export const up = (pgm) => {
  pgm.createType("alarm_status", ["active", "cleared"]);
  pgm.createType("alarm_severity", [
    "critical",
    "warning",
    "info",
  ]);

  pgm.createTable("alarms", {
    alarmId: {
      type: "text",
      primaryKey: true,
    },

    // later plantId and deviceId will reference there own tables
    plantId: {
      type: "bigint",
      notNull: true,
    },

    deviceId: {
      type: "bigint",
      notNull: true,
    },

    gatewayEventId: {
      type: "text",
      notNull: true,
    },

    tagId: {
      type: "text",
      notNull: true,
    },

    bitName: {
      type: "text",
    },

    faultId: {
      type: "text",
      notNull: true,
    },

    alarmCode: {
      type: "text",
    },

    message: {
      type: "text",
    },

    severity: {
      type: "alarm_severity",
      notNull: true,
    },

    startTime: {
      type: "timestamptz",
      notNull: true,
    },

    clearTime: {
      type: "timestamptz",
    },

    status: {
      type: "alarm_status",
      notNull: true,
      default: "active",
    },

    clearReason: {
      type: "text",
    },

    isAcknowledged: {
      type: "boolean",
      notNull: true,
      default: false,
    },

    acknowledgedAt: {
      type: "timestamptz",
    },

    // later reference users table
    acknowledgedBy: {
      type: "uuid",
    },

    updatedAt: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("alarms", "status");
  pgm.createIndex("alarms", "severity");
  pgm.createIndex("alarms", "startTime");

  pgm.createIndex("alarms", ["plantId", "startTime"], {
    name: "alarms_plant_start_time_idx",
  });
};

export const down = (pgm) => {
  pgm.dropTable("alarms");

  pgm.dropType("alarm_severity");
  pgm.dropType("alarm_status");
};

