import { Modal, ModalBody, ModalFooter, ModalTitle } from './Modal';
import { Button } from './Button';
import { WarningCircle } from '@phosphor-icons/react';
import { useId, useRef } from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Chấp nhận',
  cancelText = 'Hủy',
  isLoading = false,
}: AlertDialogProps) {
  const descriptionId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm" 
      preventCloseOnOverlayClick={true} // Never close on backdrop for alert dialogs
      role="alertdialog"
      aria-describedby={descriptionId}
      initialFocusRef={cancelBtnRef}
    >
      <ModalBody className="text-center pt-8 pb-6 flex flex-col items-center">
        <WarningCircle className="h-10 w-10 text-rose-500 mb-2" weight="duotone" aria-hidden="true" />
        <ModalTitle className="text-xl font-bold text-foreground mb-2">
          {title}
        </ModalTitle>
        <p className="text-sm text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      </ModalBody>
      <ModalFooter className="flex justify-center gap-3 sm:justify-center border-none bg-transparent pt-0 pb-6">
        <Button
          ref={cancelBtnRef}
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {cancelText}
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Đang xử lý...' : confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
