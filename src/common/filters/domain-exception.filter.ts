import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  EntityNotFoundError,
  InsufficientFundsError,
  InsufficientSharesError,
} from '../errors/domain.errors';

@Injectable()
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

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

    this.logger.warn({ error: exception.name, message: exception.message, status }, 'Domain error');

    response.status(status).json({
      error: exception.name,
      message: exception.message,
    });
  }
}
