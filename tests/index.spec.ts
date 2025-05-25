import { describe, expect, test } from 'vitest';
import { Env, Hono } from 'hono';
import { createServiceIdentifier, IServiceScope, ServiceCollection } from '../src/index';
import { injectServices, useService } from '../src/index';
import { randomUUID } from 'crypto';

describe('injectServices', () => {
  test('it should create a service scope and dispose of it after the request', async () => {
    interface ITestService {
      id(): string;
    }

    class TestService implements ITestService {
      constructor() {}

      public id() {
        return randomUUID();
      }
    }

    const serviceId = createServiceIdentifier<ITestService>();
    const services = new ServiceCollection();
    services.addScoped(serviceId, TestService);

    const sp = services.build();
    const app = new Hono<Env>();

    app.use(injectServices(sp));

    app.get('/', c => {
      const scope = c.get('serviceScope');
      const testService = scope!.serviceProvider.getService(serviceId);
      return c.json({ id: testService.id() });
    });

    const res1 = await app.request('/');
    const json1 = await res1.json();
    const firstId = json1.id;

    const res2 = await app.request('/');
    const json2 = await res2.json();
    const secondId = json2.id;

    expect(firstId).not.toEqual(secondId);
  });
});

describe('useService', () => {
  test('it should throw an error if the service scope is not found in context', async () => {
    type ITestService = object;
    
    const serviceId = createServiceIdentifier<ITestService>();
    const app = new Hono<Env>();

    app.get('/', c => {
      try {
        useService(c, serviceId);
        return c.text('Service scope found', 200);
      } catch {
        return c.text('Service scope not found', 500);
      }
    });

    const res = await app.request('/');

    expect(res.status).toBe(500);
  });

  test('it should throw an error if the service scope is not an instance of ServiceScope', async () => {
    type ITestService = object;
    
    const serviceId = createServiceIdentifier<ITestService>();
    const app = new Hono<Env>();

    app.get('/', c => {
      c.set('serviceScope', {} as IServiceScope);
      
      try {
        useService(c, serviceId);
        return c.text('Service scope found', 200);
      } catch {
        return c.text('Service scope not found', 500);
      }
    });

    const res = await app.request('/');

    expect(res.status).toBe(500);
  });

  test('it should throw an error if the service is not registered in the service scope', async () => {
    interface ITestService {
      id(): string;
    }

    const serviceId = createServiceIdentifier<ITestService>();
    const services = new ServiceCollection();

    const sp = services.build();
    const app = new Hono<Env>();

    app.use(injectServices(sp));

    app.get('/', c => {
      try {
        useService(c, serviceId);
        return c.text('Service found', 200);
      } catch {
        return c.text('Service not found', 500);
      }
    });

    const res = await app.request('/');

    expect(res.status).toBe(500);
  });


  test('it should return the service from the service scope', async () => {
    interface ITestService {
      id(): string;
    }

    class TestService implements ITestService {
      constructor() {}

      public id() {
        return 'test-id';
      }
    }

    const serviceId = createServiceIdentifier<ITestService>();
    const services = new ServiceCollection();
    services.addScoped(serviceId, TestService);

    const sp = services.build();
    const app = new Hono<Env>();

    app.use(injectServices(sp));

    app.get('/', c => {
      const testService = useService(c, serviceId);
      return c.json({ id: testService.id() });
    });

    const res = await app.request('/');
    const data = await res.json();

    expect(data.id).toBe('test-id');
  });
});
