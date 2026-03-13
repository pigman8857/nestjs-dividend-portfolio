import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  EntityNotFoundError,
  InsufficientFundsError,
  InsufficientSharesError,
} from '../errors/domain.errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 400;
    if (exception instanceof EntityNotFoundError) status = 404;
    if (
      exception instanceof InsufficientFundsError ||
      exception instanceof InsufficientSharesError
    )
      status = 422;

    response.status(status).json({
      error: exception.name,
      message: exception.message,
    });
  }
}
