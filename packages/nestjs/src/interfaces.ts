import type { ModuleMetadata, Type } from '@nestjs/common';
import type { ZodRawShape } from 'zod';
import type { GuardOptions } from '@envguard/core';

/** Options for `EnvGuardModule.forRoot()`. */
export interface EnvGuardModuleOptions {
  /** Zod schema shape defining environment variable validation rules. */
  schema: ZodRawShape;
  /** Additional guard options (path, freeze, etc.). */
  options?: Omit<GuardOptions, 'watch'>;
}

/** Factory interface for async module registration. */
export interface EnvGuardModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /** Factory function that returns module options. */
  useFactory: (
    ...args: unknown[]
  ) => EnvGuardModuleOptions | Promise<EnvGuardModuleOptions>;
  /** Providers to inject into the factory. */
  inject?: (string | symbol | Type)[];
}
