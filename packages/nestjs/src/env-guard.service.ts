import { Inject, Injectable } from '@nestjs/common';
import { ENV_GUARD_ENV } from './constants.js';

/**
 * Service for accessing validated environment variables with full type safety.
 *
 * @example
 * ```ts
 * @Injectable()
 * class AppService {
 *   constructor(private readonly envGuard: EnvGuardService) {}
 *
 *   getPort(): number {
 *     return this.envGuard.get('PORT');
 *   }
 * }
 * ```
 */
@Injectable()
export class EnvGuardService<
  TEnv extends Record<string, unknown> = Record<string, unknown>,
> {
  constructor(
    @Inject(ENV_GUARD_ENV)
    private readonly env: TEnv,
  ) {}

  /**
   * Get a validated environment variable by key.
   * @param key - The environment variable key.
   * @returns The typed value of the environment variable.
   */
  get<K extends keyof TEnv>(key: K): TEnv[K] {
    return this.env[key];
  }

  /**
   * Get all validated environment variables.
   * @returns The full validated environment object.
   */
  getAll(): Readonly<TEnv> {
    return this.env;
  }
}
