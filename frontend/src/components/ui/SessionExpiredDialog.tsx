import { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { WarningCircle } from '@phosphor-icons/react';

export function SessionExpiredDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      // Don't show if already on login page
      if (window.location.pathname === '/login') return;
      setIsOpen(true);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const handleLoginAgain = () => {
    setIsOpen(false);
    window.location.href = '/login';
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="sm" preventCloseOnOverlayClick>
      <ModalBody className="text-center pt-8 pb-6 flex flex-col items-center">
        <WarningCircle className="h-12 w-12 text-rose-500 mb-4" weight="duotone" />
        <h3 className="text-xl font-bold text-foreground mb-2" id="session-expired-title">
          Phiên đăng nhập đã hết hạn
        </h3>
        <p className="text-sm text-muted-foreground" id="session-expired-description">
          Vì lý do bảo mật, vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
        </p>
      </ModalBody>
      <ModalFooter className="flex justify-center border-none bg-transparent pt-0 pb-6">
        <Button onClick={handleLoginAgain} className="w-full sm:w-auto" autoFocus>
          Đăng nhập lại
        </Button>
      </ModalFooter>
    </Modal>
  );
}
