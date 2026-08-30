type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const extra = args.length > 0 ? ' ' + args.map(String).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${extra}`;
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.info(formatMessage('info', message, ...args));
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message, ...args));
  },
  error(message: string, ...args: unknown[]): void {
    console.error(formatMessage('error', message, ...args));
  },
  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.info(formatMessage('debug', message, ...args));
    }
  },
};
