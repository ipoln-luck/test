
import { ERROR_CODES } from "../constants/error-codes.constants.js";

export function successResponse(
  data = null,
  message = "Success"
) {
  return {
    success: true,
    message,
    data,
  };
}


export function errorResponse(
  message = "Internal Server Error",
  code = ERROR_CODES.INTERNAL_SERVER_ERROR,
  details = null
) {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
}


