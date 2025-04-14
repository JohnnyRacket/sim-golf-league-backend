export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DatabaseError extends ApplicationError {
  public originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.originalError = originalError;
  }
}

export class ValidationError extends ApplicationError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication failed') {
    super(message);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string) {
    super(`${entity} not found`);
  }
} 