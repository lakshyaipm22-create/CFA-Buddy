/**
 * Shared ActionResult type for all Server Actions.
 * Discriminated union that ensures type safety for consumers.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
