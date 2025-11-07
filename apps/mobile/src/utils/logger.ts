import { useMemo } from 'react';
import { redact } from '@pichat/utils';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, scope: string, message: string, error?: unknown): void {
  const prefix = `[${scope}]`;
  const payload = error ? [`${prefix} ${message}`, error] : [`${prefix} ${message}`];
  switch (level) {
    case 'debug':
      console.debug(...payload);
      break;
    case 'info':
      console.info(...payload);
      break;
    case 'warn':
      console.warn(...payload);
      break;
    case 'error':
      console.error(...payload);
      break;
    default:
      console.log(...payload);
  }
}

export function useLogger(scope: string) {
  return useMemo(
    () => ({
      debug: (message: string, error?: unknown) => log('debug', scope, message, error),
      info: (message: string, error?: unknown) => log('info', scope, message, error),
      warn: (message: string, error?: unknown) => log('warn', scope, message, error),
      error: (message: string, error?: unknown) => log('error', scope, message, error),
      redact
    }),
    [scope]
  );
}
