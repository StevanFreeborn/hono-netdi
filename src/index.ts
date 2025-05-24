import {
  ServiceScope,
  type IServiceProvider,
  type IServiceScope,
  type ServiceIdentifier,
} from '@stevanfreeborn/netdi';

import type { Context, MiddlewareHandler } from 'hono';

const SERVICE_SCOPE_KEY = 'serviceScope';

declare module 'hono' {
  interface ContextVariableMap {
    [SERVICE_SCOPE_KEY]?: IServiceScope;
  }
}

export function injectServices(serviceProvider: IServiceProvider): MiddlewareHandler {
  return async (c: Context, next: () => Promise<void>) => {
    const scope = serviceProvider.createScope();

    c.set(SERVICE_SCOPE_KEY, scope);

    try {
      await next();
    } finally {
      scope.dispose();
    }
  };
}

export function useService<T>(c: Context, serviceType: ServiceIdentifier<T>): T {
  const scope = c.get(SERVICE_SCOPE_KEY);

  if (!scope) {
    throw new Error(
      'Service scope not found in context. Did you add the injectServices middleware?',
    );
  }

  if (scope instanceof ServiceScope === false) {
    throw new Error('Service scope is not an instance of ServiceScope.');
  }

  return scope.serviceProvider.getService(serviceType);
}
