# @stacklance/envguard-nestjs

NestJS dynamic module for Zod-based environment variable validation.

## Installation

```bash
npm install @stacklance/envguard-nestjs @stacklance/envguard-core zod
```

## Usage

### `forRoot`

```ts
import { Module } from '@nestjs/common';
import { EnvGuardModule } from '@stacklance/envguard-nestjs';
import { z } from 'zod';

@Module({
  imports: [
    EnvGuardModule.forRoot({
      schema: {
        PORT: z.coerce.number().default(3000),
        DB_URL: z.string().url(),
        API_KEY: z.string().min(1),
      },
    }),
  ],
})
export class AppModule {}
```

### `forRootAsync`

```ts
EnvGuardModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    schema: {
      PORT: z.coerce.number().default(3000),
      DB_URL: z.string().url(),
    },
    options: {
      path: config.get('ENV_PATH', '.env'),
    },
  }),
  inject: [ConfigService],
});
```

### Injecting `EnvGuardService`

```ts
import { Injectable } from '@nestjs/common';
import { EnvGuardService } from '@stacklance/envguard-nestjs';

@Injectable()
export class AppService {
  constructor(private readonly envGuard: EnvGuardService) {}

  getPort(): number {
    return this.envGuard.get('PORT');
  }

  getAllEnv() {
    return this.envGuard.getAll();
  }
}
```

## Features

- Validates environment variables at application bootstrap
- Throws `EnvGuardError` with detailed per-key errors if validation fails
- Global module - `EnvGuardService` is available everywhere after import
- Full TypeScript inference via Zod schemas

## API

### `EnvGuardModule.forRoot(options)`

| Option    | Type           | Description                              |
| --------- | -------------- | ---------------------------------------- |
| `schema`  | `ZodRawShape`  | Zod schema shape for env validation      |
| `options`  | `GuardOptions` | Optional path, freeze, masked settings   |

### `EnvGuardModule.forRootAsync(options)`

| Option       | Type         | Description                           |
| ------------ | ------------ | ------------------------------------- |
| `imports`    | `Module[]`   | Modules to import                     |
| `useFactory` | `Function`   | Factory returning module options      |
| `inject`     | `Provider[]` | Providers to inject into factory      |

### `EnvGuardService`

| Method      | Returns          | Description                          |
| ----------- | ---------------- | ------------------------------------ |
| `get(key)`  | `TEnv[K]`        | Get a single validated env var       |
| `getAll()`  | `Readonly<TEnv>` | Get all validated env vars           |

## License

MIT
