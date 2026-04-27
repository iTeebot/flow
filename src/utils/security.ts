/**
 * Security utilities for the application.
 */

/**
 * Disables the default context menu (right-click) across the entire application.
 * This is often used in kiosk-mode apps or to protect UI elements from inspection
 * in production environments.
 */
export const disableRightClick = () => {
  if (typeof window !== 'undefined') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, false);
  }
};
