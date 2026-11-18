import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const focusHandlers = useDialogFocus();
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[59] bg-[var(--overlay)] backdrop-blur-sm" />
        <Dialog.Content {...focusHandlers} className="fixed inset-y-0 right-0 z-[60] w-full max-w-[600px] border-l border-border bg-[var(--surface)] shadow-lg outline-none">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
