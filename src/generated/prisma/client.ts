/**
 * Stub for the Prisma generated client.
 * This file provides a working PrismaClient class when prisma generate
 * has not been run (no DATABASE_URL available).
 * When prisma generate runs with a real connection, it will overwrite
 * this directory with the actual generated code.
 */

export type CfaLevel = 'I' | 'II' | 'III';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Confidence = 'Guess' | 'ThinkSo' | 'Certain';
export type ErrorClassification =
  | 'DidntKnow'
  | 'ForgotFormula'
  | 'CalculationMistake'
  | 'MisreadQuestion'
  | 'Careless'
  | 'TimePressure'
  | 'Unclassified';
export type ContentType = 'PDF' | 'VideoLink' | 'FormulaSheet' | 'Unknown';
export type SessionStatus = 'Active' | 'Completed' | 'Abandoned';
export type TestMode =
  | 'Topic'
  | 'Subject'
  | 'Mixed'
  | 'QuickTopic'
  | 'AdaptiveRetest'
  | 'Random'
  | 'WeakTopic';

function createStubDelegate(): Record<string, unknown> {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (typeof prop === 'string') {
        return () => {
          throw new Error(
            `Database not configured. Cannot call prisma method "${String(prop)}". ` +
              'Please set DATABASE_URL and run prisma generate.'
          );
        };
      }
      return undefined;
    },
  };
  return new Proxy({}, handler) as Record<string, unknown>;
}

export class PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options?: Record<string, unknown>) {
    return new Proxy(this, {
      get(target, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {
            /* no-op */
          };
        }
        if (typeof prop === 'string' && !prop.startsWith('_')) {
          return createStubDelegate();
        }
        return Reflect.get(target, prop);
      },
    });
  }

  async $connect(): Promise<void> {
    /* no-op stub */
  }

  async $disconnect(): Promise<void> {
    /* no-op stub */
  }
}
