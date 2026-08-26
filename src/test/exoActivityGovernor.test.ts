import { describe, expect, it } from 'vitest';
import { parseHidIdleTimeMs } from '../server/services/exoActivityGovernor.js';

describe('Exo activity governor', () => {
  it('converts the macOS HID idle counter from nanoseconds to milliseconds', () => {
    expect(parseHidIdleTimeMs('    "HIDIdleTime" = 1250000000')).toBe(1250);
  });

  it('returns null when ioreg does not expose HID idle time', () => {
    expect(parseHidIdleTimeMs('{ "OtherValue" = 1 }')).toBeNull();
  });
});
