import { DynamicModule, Module, type Provider } from '@nestjs/common';
import { guard } from '@stacklance/envguard-core';
import { ENV_GUARD_ENV } from './constants.js';
import { EnvGuardService } from './env-guard.service.js';
import type {
  EnvGuardModuleOptions,
  EnvGuardModuleAsyncOptions,
} from './interfaces.js';

/**
 * NestJS dynamic module for environment variable validation using Zod schemas.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 *
 * @Module({
 *   imports: [
 *     EnvGuardModule.forRoot({
 *       schema: {
 *         PORT: z.coerce.number().default(3000),
 *         DB_URL: z.string().url(),
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class EnvGuardModule {
  /**
   * Register the module with a static configuration.
   * Validates environment variables immediately on module initialization.
   *
   * @param moduleOptions - The schema and guard options.
   * @returns A configured dynamic module.
   * @throws {EnvGuardError} If environment validation fails.
   */
  static forRoot(moduleOptions: EnvGuardModuleOptions): DynamicModule {
    const env = guard(moduleOptions.schema, moduleOptions.options);

    const envProvider: Provider = {
      provide: ENV_GUARD_ENV,
      useValue: env,
    };

    return {
      module: EnvGuardModule,
      global: true,
      providers: [envProvider, EnvGuardService],
      exports: [EnvGuardService, ENV_GUARD_ENV],
    };
  }

  /**
   * Register the module with an async configuration factory.
   * Useful when guard options depend on other providers.
   *
   * @param asyncOptions - Async configuration with a factory function.
   * @returns A configured dynamic module.
   */
  static forRootAsync(asyncOptions: EnvGuardModuleAsyncOptions): DynamicModule {
    const envProvider: Provider = {
      provide: ENV_GUARD_ENV,
      useFactory: (...args: unknown[]) => {
        const factory = asyncOptions.useFactory;
        const moduleOptions = factory(...args) as EnvGuardModuleOptions;
        return guard(moduleOptions.schema, moduleOptions.options);
      },
      inject: asyncOptions.inject ?? [],
    };

    return {
      module: EnvGuardModule,
      global: true,
      imports: asyncOptions.imports ?? [],
      providers: [envProvider, EnvGuardService],
      exports: [EnvGuardService, ENV_GUARD_ENV],
    };
  }
}
