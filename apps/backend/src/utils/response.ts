import { Response } from 'express';
import { ApiResponse } from '@bharatassist/shared-types';

export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200): Response => {
  const responseEnvelope: ApiResponse<T> = {
    success: true,
    data
  };
  return res.status(statusCode).json(responseEnvelope);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): Response => {
  const responseEnvelope: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details })
    }
  };
  return res.status(statusCode).json(responseEnvelope);
};
