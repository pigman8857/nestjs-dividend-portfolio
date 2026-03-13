export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(userId: string, requiredCents: number, availableCents: number) {
    super(
      `User ${userId} has ${availableCents} cents but needs ${requiredCents} cents`,
    );
  }
}

export class InsufficientSharesError extends DomainError {
  constructor(userId: string, requested: number, held: number) {
    super(`User ${userId} holds ${held} shares but requested ${requested}`);
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}
