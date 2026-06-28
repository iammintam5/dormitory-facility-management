import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from './Modal';
import { Button } from './Button';
import { WarningCircle, Info, Question } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isLoading = false,
  type = 'default',
}: ConfirmDialogProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <WarningCircle className="h-10 w-10 text-rose-500 mb-2" weight="duotone" />;
      case 'warning':
        return <WarningCircle className="h-10 w-10 text-amber-500 mb-2" weight="duotone" />;
      case 'info':
        return <Info className="h-10 w-10 text-blue-500 mb-2" weight="duotone" />;
      default:
        return <Question className="h-10 w-10 text-emerald-500 mb-2" weight="duotone" />;
    }
  };

  const getConfirmButtonVariant = () => {
    if (type === 'danger') return 'destructive';
    if (type === 'warning') return 'outline'; // Or custom warning variant if exists
    return 'default';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" preventCloseOnOverlayClick={isLoading}>
      <ModalBody className="text-center pt-8 pb-6 flex flex-col items-center">
        {getIcon()}
        <h3 className="text-xl font-bold text-foreground mb-2" id="alert-dialog-title">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground" id="alert-dialog-description">
          {description}
        </p>
      </ModalBody>
      <ModalFooter className="flex justify-center gap-3 sm:justify-center border-none bg-transparent pt-0 pb-6">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="min-w-[100px]"
        >
          {cancelText}
        </Button>
        <Button
          variant={getConfirmButtonVariant()}
          onClick={onConfirm}
          disabled={isLoading}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Đang xử lý...
            </span>
          ) : (
            confirmText
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// AlertDialog is identical but strictly for destructive/unrecoverable actions
export function AlertDialog(props: Omit<ConfirmDialogProps, 'type'>) {
  return <ConfirmDialog {...props} type="danger" />;
}
