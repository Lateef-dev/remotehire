export interface ErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details?: ErrorDetail[];

  constructor(status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(msg: string, details?: ErrorDetail[]) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to do that') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg: string) { return new ApiError(409, msg); }
}
