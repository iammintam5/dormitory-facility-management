import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CouncilMember } from '../../types/council';
import { useToast } from '../../toast/toast-context';
import { CouncilMemberSelect, CouncilMemberState } from './CouncilMemberSelect';

interface CouncilUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMembers: CouncilMember[];
  onSubmit: (members: { userId: number; roleInCouncil: string }[]) => Promise<void>;
}

export function CouncilUpdateModal({
  isOpen,
  onClose,
  initialMembers,
  onSubmit,
}: CouncilUpdateModalProps) {
  const { showToast } = useToast();
  const [members, setMembers] = useState<CouncilMemberState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMembers(
        initialMembers.map((m) => ({
          user: m.user,
          roleInCouncil: m.roleInCouncil,
        })),
      );
    }
  }, [isOpen, initialMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (members.some((m) => !m.roleInCouncil.trim())) {
      showToast('Vui lòng nhập đầy đủ chức danh cho các thành viên.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(
        members.map((m) => ({
          userId: m.user.id,
          roleInCouncil: m.roleInCouncil.trim(),
        })),
      );
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cập nhật danh sách Hội đồng"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <CouncilMemberSelect members={members} onChange={setMembers} disabled={isSubmitting} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Lưu danh sách
          </Button>
        </div>
      </form>
    </Modal>
  );
}
