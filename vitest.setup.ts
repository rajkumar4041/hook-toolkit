import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure React trees are unmounted between tests so cleanup logic
// (listeners, timers, observers) runs and does not leak across cases.
afterEach(() => {
  cleanup();
});
