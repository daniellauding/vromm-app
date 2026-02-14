/**
 * Password Reset Bridge
 * Allows AppContent to close password sheet when handling deep links
 */

let closePasswordSheetCallback: (() => void) | null = null;

export function registerClosePasswordSheet(callback: () => void) {
  closePasswordSheetCallback = callback;
}

export function unregisterClosePasswordSheet() {
  closePasswordSheetCallback = null;
}

export function closePasswordSheet() {
  if (closePasswordSheetCallback) {
    closePasswordSheetCallback();
  }
}
