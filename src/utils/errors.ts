export class ApplicationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class DatabaseError extends ApplicationError {
  public originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message, 500);
    this.originalError = originalError;
  }
}

export class ValidationError extends ApplicationError {
  public details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400);
    this.details = details;
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message, 403);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string) {
    super(`${entity} not found`, 404);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 409);
  }
}
