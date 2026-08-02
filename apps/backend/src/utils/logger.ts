import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'phone',
      'body.phone',
      'req.body.phone',
      'income',
      'incomeMax',
      'incomeBand',
      'disabilityStatus',
      'prompt',
      'rawPrompt',
      'aiResponse',
      '*.phone',
      '*.income',
      '*.disabilityStatus'
    ],
    censor: '[REDACTED_PII]'
  }
});
