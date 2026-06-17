// Base typed error carrying an HTTP status and a stable machine `code`. The
// error middleware maps these to the response envelope; anything that is not an
// AppError becomes a generic 500.
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message)
  }
}
