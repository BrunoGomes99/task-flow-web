import { defineConfig } from 'vitest/config';

// Local midnight and end-of-day depend on the zone. Pin it so the date tests
// do not follow the machine or the CI runner.
export default defineConfig({
  test: {
    env: {
      TZ: 'America/Sao_Paulo',
    },
  },
});
