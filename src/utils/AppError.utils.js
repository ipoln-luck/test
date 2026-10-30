
import { ERROR_CODES } from "../constants/error-codes.constants.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
