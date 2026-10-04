export const CLERK_ENV_KEY = "VITE_CLERK_PUBLISHABLE_KEY";

/**
 * Resolves the Clerk publishable key from `import.meta.env`, returning
 * `undefined` when it is absent or blank. The reader must keep working without
 * a key, so callers use this to decide whether to enable Clerk or render the
 * graceful (no-auth) shell.
 */
export function resolveClerkKey(
  env: Record<string, unknown> = import.meta.env,
): string | undefined {
  const value = env[CLERK_ENV_KEY];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
