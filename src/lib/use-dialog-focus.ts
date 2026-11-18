import { useRef } from "react";

// Controlled dialogs have no Radix Trigger to restore focus to on close.
export function useDialogFocus() {
  const previousFocus = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus(event: Event) {
      previousFocus.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      const initialFocus = (event.target as HTMLElement).querySelector<HTMLElement>("[data-autofocus]");
      if (initialFocus) {
        event.preventDefault();
        initialFocus.focus();
      }
    },
    onCloseAutoFocus(event: Event) {
      if (previousFocus.current?.isConnected) {
        event.preventDefault();
        previousFocus.current.focus();
      }
    },
  };
}
