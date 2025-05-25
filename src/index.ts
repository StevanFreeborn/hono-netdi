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

/**
 * Creates a Hono middleware that manages dependency injection service scopes for each request.
 * 
 * This middleware creates a new service scope at the beginning of each request and automatically
 * disposes of it when the request completes, ensuring proper resource cleanup and preventing
 * memory leaks. The service scope is stored in the Hono context and can be accessed by subsequent
 * middleware and route handlers.
 * 
 * @param serviceProvider - The root service provider from which to create scoped instances
 * @returns A Hono middleware handler that manages service scope lifecycle
 * 
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { injectServices, useService, ServiceCollection } from '@stevanfreeborn/hono-netdi';
 * 
 * // Configure services
 * const services = new ServiceCollection();
 * services.addScoped(MyService);
 * const serviceProvider = services.build();
 * 
 * // Create Hono app with DI middleware
 * const app = new Hono();
 * app.use(injectServices(serviceProvider));
 * 
 * app.get('/', (c) => {
 *   const myService = useService(c, MyService);
 *   return c.json({ data: myService.getData() });
 * });
 * ```
 * 
 * @throws {Error} If the service provider is null or undefined
 * @see {@link useService} for accessing services within request handlers
 */
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

/**
 * Retrieves a service instance from the current request's dependency injection scope.
 * 
 * This function extracts the service scope from the Hono context (which must have been
 * set by the `injectServices` middleware) and uses it to resolve the requested service.
 * Services are resolved according to their configured lifetime (singleton, scoped, or transient).
 * 
 * @template T - The type of service to retrieve
 * @param c - The Hono context containing the service scope
 * @param serviceType - The service identifier used to resolve the service instance
 * @returns The resolved service instance of type T
 * 
 * @example
 * ```typescript
 * import { Context } from 'hono';
 * import { useService, createServiceIdentifier } from '@stevanfreeborn/hono-netdi';
 * 
 * interface IUserService {
 *   getUser(id: string): Promise<User>;
 * }
 * 
 * const userServiceId = createServiceIdentifier<IUserService>();
 * 
 * app.get('/users/:id', async (c: Context) => {
 *   const userService = useService(c, userServiceId);
 *   const user = await userService.getUser(c.req.param('id'));
 *   return c.json(user);
 * });
 * ```
 * 
 * @throws {Error} When the service scope is not found in the context (typically when
 *                 `injectServices` middleware was not properly configured)
 * @throws {Error} When the service scope is not a valid ServiceScope instance
 * @throws {Error} When the requested service cannot be resolved (service not registered,
 *                 missing dependencies, etc.)
 * 
 * @see {@link injectServices} for setting up the dependency injection middleware
 */
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

export * from '@stevanfreeborn/netdi';