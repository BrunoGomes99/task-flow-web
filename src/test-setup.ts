import * as matchers from '@testing-library/jest-dom/matchers';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

declare module 'vitest' {
  // Vitest 5's Matchers<R, T> is the extension point. jest-dom still augments the
  // old one-parameter Assertion, which no longer merges. The body is empty because
  // the matchers come from the extends clause; T exists only to merge with Vitest.
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}
