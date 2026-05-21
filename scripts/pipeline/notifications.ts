// ============================================================================
// NOTIFICATIONS — macOS notification helpers
// ============================================================================

import { spawnSync } from 'child_process';

export function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function sendMacNotification(title: string, message: string, subtitle?: string) {
  const parts = [
    `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`,
  ];
  if (subtitle) {
    parts[0] += ` subtitle "${escapeAppleScript(subtitle)}"`;
  }
  spawnSync('/usr/bin/osascript', ['-e', parts[0]], { stdio: 'ignore' });
}
