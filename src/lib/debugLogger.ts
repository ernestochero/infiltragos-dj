const isProduction = process.env.NODE_ENV === 'production';
const buildTimeFlag = process.env.NEXT_PUBLIC_ENABLE_CLIENT_DEBUG_LOGS === 'true';

declare global {
  interface Window {
    __ENABLE_DEBUG_LOGS__?: boolean;
  }
}

function resolveRuntimeFlag(): boolean {
  const base = buildTimeFlag || !isProduction;
  if (typeof window === 'undefined') {
    return base;
  }
  const runtimeOverride = typeof window.__ENABLE_DEBUG_LOGS__ === 'boolean' ? window.__ENABLE_DEBUG_LOGS__ : undefined;
  if (typeof runtimeOverride === 'boolean') {
    return runtimeOverride;
  }
  try {
    const stored = window.localStorage?.getItem('ENABLE_DEBUG_LOGS');
    if (stored != null) {
      return stored === 'true';
    }
  } catch {
    // ignore storage errors (e.g., private mode)
  }
  return base;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMethod = (...args: unknown[]) => void;

export type ScopedLogger = {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  isEnabled: () => boolean;
};

export function createScopedLogger(scope: string, options?: { enabled?: boolean }): ScopedLogger {
  const prefix = scope ? `[${scope}]` : '';
  const shouldLog = () => (typeof options?.enabled === 'boolean' ? options.enabled : resolveRuntimeFlag());

  const buildLogger = (level: LogLevel): LogMethod => {
    return (...args: unknown[]) => {
      if (!shouldLog()) return;
      const target = console[level] ?? console.log;
      if (prefix) {
        target(prefix, ...args);
      } else {
        target(...args);
      }
    };
  };

  return {
    debug: buildLogger('debug'),
    info: buildLogger('info'),
    warn: buildLogger('warn'),
    error: buildLogger('error'),
    isEnabled: shouldLog,
  };
}
