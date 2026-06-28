import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { getApiErrorMessage } from '../lib/api-client';
import { changePassword } from '../services/auth';
import { useToast } from '../toast/toast-context';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  LockKey, 
  ShieldCheck, 
  Eye, 
  EyeSlash,
  FloppyDisk,
  Prohibit
} from '@phosphor-icons/react';

export function ChangePasswordPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'STUDENT' ? '/student' : '/manager';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { level: 1, label: 'Yếu', color: 'destructive' };
    if (score <= 3) return { level: 2, label: 'Trung bình', color: 'amber' };
    if (score <= 4) return { level: 3, label: 'Khá', color: 'primary' };
    return { level: 4, label: 'Mạnh', color: 'emerald' };
  }, [newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    let newErrors: Record<string, string> = {};

    if (!currentPassword) newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!newPassword) newErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    if (!confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu mới và xác nhận không khớp.';
    }
    if (newPassword && newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    }
    if (newPassword && newPassword === currentPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus on first error
      setTimeout(() => {
        const firstErrorId = Object.keys(newErrors)[0];
        document.getElementById(firstErrorId)?.focus();
      }, 0);
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      showToast('Đổi mật khẩu thành công.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Đổi mật khẩu thất bại.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Đổi mật khẩu" 
        breadcrumbs={[
          { label: 'Trang chủ', href: `${basePath}/dashboard` },
          { label: 'Đổi mật khẩu' }
        ]}
      />

      <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4">
        <ShieldCheck size={24} className="text-primary shrink-0 mt-0.5" weight="duotone" />
        <p className="text-sm text-foreground font-medium leading-relaxed">
          Vì lý do bảo mật, bạn nên đổi mật khẩu định kỳ và không sử dụng lại mật khẩu cũ.
          Mật khẩu mới nên có độ dài ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-shrink-0 flex items-center justify-center lg:w-[340px] w-full py-6">
              <div className="relative w-[240px] h-[240px] rounded-full bg-primary/10 flex items-center justify-center">
                <LockKey size={120} weight="duotone" className="text-primary/40" />
              </div>
            </div>

            <div className="flex-1 w-full max-w-xl">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <PasswordField
                  id="currentPassword"
                  label="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggle={() => setShowCurrent((current) => !current)}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                />
                
                <div className="space-y-2">
                  <PasswordField
                    id="newPassword"
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggle={() => setShowNew((current) => !current)}
                    error={errors.newPassword}
                    autoComplete="new-password"
                  />
                  
                  {newPassword && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Độ mạnh:
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            strengthLabelClass[strength.color] ?? ''
                          }`}
                        >
                          {strength.label}
                        </span>
                        <div className="flex items-center gap-1 flex-1">
                          {[0, 1, 2, 3].map((index) => (
                            <div
                              key={index}
                              className={`h-[4px] flex-1 rounded-full transition-all duration-300 ${
                                index < strength.level
                                  ? strengthBarClass[strength.color] ?? 'bg-muted'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc marker:text-muted-foreground/50">
                        <li>Ít nhất 8 ký tự</li>
                        <li>Có chữ hoa, chữ thường và số</li>
                        <li>Có ký tự đặc biệt</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <PasswordField
                    id="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggle={() => setShowConfirm((current) => !current)}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                  />
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <Prohibit size={16} weight="bold" />
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <FloppyDisk size={16} weight="bold" />
                    {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
  autoComplete: string;
}) {
  return (
    <Field id={id} label={label} error={error} required>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Nhập ${label.toLowerCase()}`}
          className="pr-10"
          autoComplete={autoComplete}
          name={id}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-md"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={show}
        >
          {show ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

const strengthBarClass: Record<string, string> = {
  destructive: 'bg-destructive',
  amber: 'bg-amber-500',
  primary: 'bg-primary',
  emerald: 'bg-emerald-500',
};

const strengthLabelClass: Record<string, string> = {
  destructive: 'text-destructive bg-destructive/10 border-destructive/20',
  amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  primary: 'text-primary bg-primary/10 border-primary/20',
  emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
};
