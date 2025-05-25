# hono-netdi

A powerful dependency injection middleware for [Hono.js](https://honojs.dev/), inspired by .NET's dependency injection system. This library seamlessly integrates [@stevanfreeborn/netdi](https://github.com/StevanFreeborn/netdi) with Hono applications, providing automatic service scope management and clean resource disposal for each HTTP request.

## Features

- 🔄 **Automatic Service Scope Management** - Creates and disposes service scopes per request
- 🧹 **Resource Cleanup** - Ensures proper disposal of scoped services to prevent memory leaks
- 🏗️ **Type-Safe DI** - Full TypeScript support with strongly-typed service resolution
- 🚀 **Hono Integration** - Seamless integration with Hono's middleware system
- 📦 **Lightweight** - Minimal overhead with clean, simple API
- 🔧 **Flexible** - Supports all service lifetimes (singleton, scoped, transient)

## Installation

```bash
npm install @stevanfreeborn/hono-netdi hono
```

```bash
yarn add @stevanfreeborn/hono-netdi hono
```

```bash
pnpm add @stevanfreeborn/hono-netdi hono
```

## Quick Start

```typescript
import { Hono } from 'hono';
import {
  ServiceCollection,
  createServiceIdentifier,
  injectable,
  injectServices,
  useService,
} from '@stevanfreeborn/hono-netdi';

// Define your service interface and implementation
interface IUserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

@injectable()
class UserService implements IUserService {
  async getUser(id: string) {
    return { id, name: `User ${id}` };
  }
}

// Create service identifier
const IUserService = createServiceIdentifier<IUserService>();

// Configure dependency injection
const services = new ServiceCollection();
services.addScoped(IUserService, UserService);
const serviceProvider = services.build();

// Create Hono app with DI middleware
const app = new Hono();
app.use(injectServices(serviceProvider));

// Use services in your routes
app.get('/users/:id', async c => {
  const userService = useService(c, IUserService);
  const user = await userService.getUser(c.req.param('id'));
  return c.json(user);
});

export default app;
```

## API Reference

### `injectServices(serviceProvider: IServiceProvider): MiddlewareHandler`

Creates a Hono middleware that manages dependency injection service scopes for each request.

**Parameters:**

- `serviceProvider` - The root service provider from which to create scoped instances

**Returns:**

- A Hono middleware handler that manages service scope lifecycle

**Behavior:**

- Creates a new service scope at the beginning of each request
- Stores the scope in the Hono context for access by route handlers
- Automatically disposes the scope when the request completes
- Ensures proper cleanup even if errors occur during request processing

### `useService<T>(c: Context, serviceType: ServiceIdentifier<T>): T`

Retrieves a service instance from the current request's dependency injection scope.

**Parameters:**

- `c` - The Hono context containing the service scope
- `serviceType` - The service identifier used to resolve the service instance

**Returns:**

- The resolved service instance of type `T`

**Throws:**

- `Error` - When service scope is not found in context (middleware not configured)
- `Error` - When service scope is invalid
- `Error` - When the requested service cannot be resolved

## Required Decorators

This library works with netdi's decorator system. You must use the appropriate decorators:

### `@injectable()`

Mark all service classes with the `@injectable()` decorator:

```typescript
import { injectable } from '@stevanfreeborn/hono-netdi';

@injectable()
class UserService implements IUserService {
  async getUser(id: string): Promise<User> {
    // Implementation
  }
}
```

### `@inject()`

Use `@inject()` for constructor parameters that should be injected:

```typescript
import { injectable, inject } from '@stevanfreeborn/hono-netdi';

@injectable()
class UserService implements IUserService {
  constructor(
    @inject(IUserRepository) private userRepository: IUserRepository,
    @inject(ILogger) private logger: ILogger,
  ) {}
}
```

**Note:** Without these decorators, netdi cannot properly resolve dependencies and will throw runtime errors.

**Note:** The argument passed to the `@inject()` decorator should be the service identifier created with `createServiceIdentifier()` that was used to register the service.

## Advanced Usage

### Service Lifetimes

The library supports all service lifetimes provided by netdi:

```typescript
import { ServiceCollection, createServiceIdentifier, injectable } from '@stevanfreeborn/hono-netdi';

@injectable()
class ConfigService {
  getConnectionString(): string {
    return process.env.DB_CONNECTION_STRING || '';
  }
}

@injectable()
class UserService {
  getUsers(): Promise<User[]> {
    // Implementation here
    return Promise.resolve([]);
  }
}

@injectable()
class Logger {
  log(message: string): void {
    console.log(message);
  }
}

const IConfigService = createServiceIdentifier<ConfigService>();
const IUserService = createServiceIdentifier<UserService>();
const ILogger = createServiceIdentifier<Logger>();

const services = new ServiceCollection();

// Singleton - One instance for the entire application
services.addSingleton(IConfigService, ConfigService);

// Scoped - One instance per request scope
services.addScoped(IUserService, UserService);

// Transient - New instance every time it's requested
services.addTransient(ILogger, Logger);
```

### Service Dependencies

Services can depend on other services through constructor injection using the `@inject()` decorator:

```typescript
import { injectable, inject, createServiceIdentifier } from '@stevanfreeborn/hono-netdi';

interface ILogger {
  log(message: string): void;
}

interface IUserRepository {
  findById(id: string): Promise<User>;
}

interface IUserService {
  getUser(id: string): Promise<User>;
}

const ILogger = createServiceIdentifier<ILogger>();
const IUserRepository = createServiceIdentifier<IUserRepository>();
const IUserService = createServiceIdentifier<IUserService>();

@injectable()
class Logger implements ILogger {
  log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

@injectable()
class UserRepository implements IUserRepository {
  constructor(@inject(ILogger) private logger: ILogger) {}

  async findById(id: string): Promise<User> {
    this.logger.log(`Finding user with id: ${id}`);
    // Database logic here
    return { id, name: `User ${id}` };
  }
}

@injectable()
class UserService implements IUserService {
  constructor(
    @inject(IUserRepository) private userRepository: IUserRepository,
    @inject(ILogger) private logger: ILogger,
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.log(`Getting user with id: ${id}`);
    return await this.userRepository.findById(id);
  }
}

const services = new ServiceCollection();
services.addSingleton(ILogger, Logger);
services.addScoped(IUserRepository, UserRepository);
services.addScoped(IUserService, UserService);
```

### Multiple Service Implementations

Register multiple implementations of the same interface:

```typescript
import { injectable, createServiceIdentifier } from '@stevanfreeborn/hono-netdi';

interface INotificationService {
  send(message: string): Promise<void>;
}

@injectable()
class EmailNotificationService implements INotificationService {
  async send(message: string) {
    console.log(`Email: ${message}`);
  }
}

@injectable()
class SmsNotificationService implements INotificationService {
  async send(message: string) {
    console.log(`SMS: ${message}`);
  }
}

const EmailNotification = createServiceIdentifier<INotificationService>();
const SmsNotification = createServiceIdentifier<INotificationService>();

services.addScoped(EmailNotification, EmailNotificationService);
services.addScoped(SmsNotification, SmsNotificationService);

// Use in routes
app.post('/notify', async c => {
  const emailService = useService(c, EmailNotification);
  const smsService = useService(c, SmsNotification);

  await emailService.send('Hello via email!');
  await smsService.send('Hello via SMS!');

  return c.json({ success: true });
});
```

### Factory Registration

Register services using factory functions for complex initialization:

```typescript
import { injectable, inject, createServiceIdentifier } from '@stevanfreeborn/hono-netdi';

interface IDatabaseConfig {
  connectionString: string;
  timeout: number;
}

interface IDatabase {
  query(sql: string): Promise<any[]>;
}

@injectable()
class Database implements IDatabase {
  constructor(@inject(IDatabaseConfig) private config: IDatabaseConfig) {}

  async query(sql: string): Promise<any[]> {
    // Database query implementation
    return [];
  }
}

const IDatabaseConfig = createServiceIdentifier<IDatabaseConfig>();
const IDatabase = createServiceIdentifier<IDatabase>();

services.addSingleton<IDatabaseConfig>(IDatabaseConfig, () => ({
  connectionString: process.env.DB_CONNECTION_STRING!,
  timeout: 30000,
}));

services.addScoped(IDatabase, provider => {
  const config = provider.getService(IDatabaseConfig);
  return new Database(config);
});
```

### Error Handling

The middleware automatically handles service scope disposal even when errors occur:

```typescript
app.get('/error-example', async c => {
  const userService = useService(c, IUserService);

  try {
    // This might throw an error
    const user = await userService.getUser('invalid-id');
    return c.json(user);
  } catch (error) {
    // Service scope will still be properly disposed
    return c.json({ error: 'User not found' }, 404);
  }
});
```

### Custom Middleware Order

The `injectServices` middleware should be registered early in your middleware chain:

```typescript
const app = new Hono();

// Register DI middleware first
app.use(injectServices(serviceProvider));

// Then other middleware
app.use(cors());
app.use(logger());

// Routes can now use services
app.get('/', c => {
  const service = useService(c, IMyService);
  return c.json(service.getData());
});
```

## Best Practices

### Service Interface Design

Define clear interfaces for your services:

```typescript
// ✅ Good - Clear interface with specific methods
interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserRequest): Promise<User>;
  updateUser(id: string, data: UpdateUserRequest): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// ❌ Avoid - Vague or overly broad interfaces
interface IService {
  doSomething(data: any): any;
}
```

### Use Decorators Properly

Always use `@injectable()` on service classes and `@inject()` for dependencies:

```typescript
import { injectable, inject, createServiceIdentifier } from '@stevanfreeborn/netdi';

const ILogger = createServiceIdentifier<ILogger>();

@injectable()
class UserService {
  constructor(@inject(ILogger) private logger: ILogger) {}

  async getUser(id: string): Promise<User> {
    this.logger.log(`Getting user ${id}`);
    // Implementation
  }
}
```

### Service Lifetime Selection

Choose appropriate service lifetimes:

```typescript
// Singleton - For stateless services, configuration, caches
services.addSingleton(IConfigService, ConfigService);
services.addSingleton(ILogger, Logger);

// Scoped - For services that maintain state per request
services.addScoped(IUserService, UserService);
services.addScoped(IDatabaseContext, DatabaseContext);

// Transient - For lightweight, stateless services
services.addTransient(IValidator, Validator);
services.addTransient(IMapper, Mapper);
```

### Dependency Management

Keep dependencies minimal and well-defined:

```typescript
// ✅ Good - Clear, minimal dependencies
@injectable()
class UserService implements IUserService {
  constructor(
    @inject(IUserRepository) private userRepository: IUserRepository,
    @inject(ILogger) private logger: ILogger,
  ) {}
}

// ❌ Avoid - Too many dependencies (consider refactoring)
@injectable()
class UserService implements IUserService {
  constructor(
    @inject(IRepo1) private repo1: IRepo1,
    @inject(IRepo2) private repo2: IRepo2,
    @inject(IService1) private service1: IService1,
    @inject(IService2) private service2: IService2,
    @inject(IService3) private service3: IService3,
    // ... too many dependencies
  ) {}
}
```

## Troubleshooting

### Service scope not found error

**Solution:** Ensure `injectServices` middleware is registered before routes that use `useService`:

```typescript
// ✅ Correct order
app.use(injectServices(serviceProvider));
app.get('/', c => useService(c, IMyService));

// ❌ Wrong order
app.get('/', c => useService(c, IMyService));
app.use(injectServices(serviceProvider));
```

### Service not registered error

**Solution:** Ensure the service is registered in your service collection:

```typescript
const services = new ServiceCollection();
services.addScoped(IMyService, MyService); // Register the service
const serviceProvider = services.build();
```

### Decorator errors

**Solution:** Ensure your `tsconfig.json` has decorators enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Related Projects

- [@stevanfreeborn/netdi](https://github.com/StevanFreeborn/netdi) - The core dependency injection container
- [Hono.js](https://honojs.dev/) - The fast, lightweight web framework this middleware is designed for

## Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Search existing [GitHub issues](https://github.com/StevanFreeborn/hono-netdi/issues)
3. Create a new issue with a minimal reproduction case
