import pino from 'pino'

// JSON logger for queryable structured logs
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

export default logger
