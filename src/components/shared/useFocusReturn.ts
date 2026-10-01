import { useCallback, useRef } from 'react';

/**
 * Focus bookkeeping for a controlled Dialog driven by external buttons.
 *
 * Radix only returns focus to a `DialogTrigger`; a controlled dialog opened from
 * an arbitrary button has none, so focus lands on `<body>` after every close
 * path (X, Escape, overlay, save). This captures the invoking element and hands
 * it back on close.
 *
 * The mobile nav case matters: the sheet button that launched the dialog
 * unmounts with the sheet, so callers pass the still-mounted launcher instead.
 */
export function useFocusReturn() {
  const triggerRef = useRef<HTMLElement | null>(null);

  const capture = useCallback((element: HTMLElement) => {
    triggerRef.current = element;
  }, []);

  /**
   * Returns focus to the captured element on the next frame: Radix's teardown
   * re-focuses the (still-mounted, animating) dialog content after a close, so
   * a synchronous restore would be overwritten and leave focus on the X button.
   * Returns false when the captured element is gone or was <body>.
   */
  const restore = useCallback(() => {
    const target = triggerRef.current;
    triggerRef.current = null;
    if (!target?.isConnected || target === document.body) return false;
    requestAnimationFrame(() => target.focus());
    return true;
  }, []);

  return { triggerRef, capture, restore };
}
