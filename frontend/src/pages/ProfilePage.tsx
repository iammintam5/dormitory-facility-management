import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { formatDateOnly, formatDateTime } from '../lib/date';
import { getApiErrorMessage } from '../lib/api-client';
import { getMyProfile, updateMyProfile } from '../services/profiles';
import { useToast } from '../toast/toast-context';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select as UISelect } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { User, Camera, FloppyDisk, ArrowsClockwise } from '@phosphor-icons/react';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const basePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'STUDENT' ? '/student' : '/manager';

  const initialProfile = {
    fullName: user?.fullName ?? 'Nguyễn Văn An',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    dob: user?.profile?.dateOfBirth ? user.profile.dateOfBirth.slice(0, 10) : '',
    gender: user?.profile?.gender ?? 'Nam',
    address: user?.profile?.address ?? '',
    notes: user?.profile?.notes ?? '',
  };

  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [dob, setDob] = useState(initialProfile.dob);
  const [gender, setGender] = useState(initialProfile.gender);
  const [address, setAddress] = useState(initialProfile.address);
  const [notes, setNotes] = useState(initialProfile.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function bootstrapProfile() {
      try {
        const profile = await getMyProfile();
        setFullName(profile.fullName);
        setEmail(profile.email ?? '');
        setPhone(profile.phone ?? '');
        setDob(profile.profile?.dateOfBirth ? profile.profile.dateOfBirth.slice(0, 10) : '');
        setGender(profile.profile?.gender ?? 'Nam');
        setAddress(profile.profile?.address ?? '');
        setNotes(profile.profile?.notes ?? '');
      } catch {
        // Fallback to auth context data already shown on screen.
      }
    }

    void bootstrapProfile();
  }, []);

  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Quản trị hệ thống'
      : user?.role === 'MANAGER'
        ? 'Quản lý cơ sở vật chất'
        : 'Sinh viên nội trú';

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Họ tên và email là bắt buộc.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMyProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        dateOfBirth: dob || null,
        gender: gender || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      await refreshUser();
      showToast('Đã cập nhật thông tin cá nhân.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Cập nhật hồ sơ thất bại.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFullName(initialProfile.fullName);
    setEmail(initialProfile.email);
    setPhone(initialProfile.phone);
    setDob(initialProfile.dob);
    setGender(initialProfile.gender);
    setAddress(initialProfile.address);
    setNotes(initialProfile.notes);
    showToast('Đã khôi phục thông tin ban đầu.');
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Hồ sơ cá nhân" 
        breadcrumbs={[
          { label: 'Trang chủ', href: `${basePath}/dashboard` },
          { label: 'Hồ sơ cá nhân' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-4 border-border/50">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="relative mt-4">
              <div className="w-[140px] h-[140px] rounded-full bg-primary/10 border-4 border-background shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                <User size={80} weight="fill" className="text-primary/40 mt-4" />
              </div>
              <button
                onClick={() => showToast('Tính năng ảnh đại diện sẽ được nối API sau.')}
                type="button"
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-background border border-border/50 text-muted-foreground hover:text-primary hover:bg-muted shadow-md flex items-center justify-center transition-all"
                title="Đổi ảnh đại diện"
              >
                <Camera size={18} weight="bold" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-foreground mt-5">{fullName}</h2>
            <div className="mt-2">
              <Badge variant="default">{roleLabel}</Badge>
            </div>

            <div className="w-full border-t border-border/50 my-6"></div>

            <div className="w-full space-y-4 text-sm">
              <InfoRow label="Mã người dùng" value={user?.userCode ?? '--'} />
              <InfoRow label="Vai trò" value={user?.role ?? 'STUDENT'} />
              <InfoRow label="Ngày tạo tài khoản" value={formatDateTime(user?.createdAt)} />
              <InfoRow label="Trạng thái" value={user?.status ?? 'ACTIVE'} active />
              <InfoRow label="Đăng nhập cuối" value={formatDateTime(user?.lastLoginAt)} />
              <InfoRow label="Ngày sinh" value={formatDateOnly(dob)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-border/50">
          <CardContent className="p-6 flex flex-col">
            <h3 className="text-sm font-bold text-foreground tracking-wider uppercase border-l-[3px] border-primary pl-2.5 mb-6">
              Thông tin cá nhân
            </h3>

            <form onSubmit={handleUpdate} className="space-y-6 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Họ và tên *">
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </Field>
                <Field label="Email *">
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field label="Số điện thoại">
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </Field>
                <Field label="Ngày sinh">
                  <Input
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                  />
                </Field>
                <Field label="Giới tính">
                  <UISelect
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </UISelect>
                </Field>
                <Field label="Địa chỉ" className="md:col-span-2">
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </Field>
                <Field label="Ghi chú" className="md:col-span-2">
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </Field>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-border/50">
                <Button
                  onClick={handleReset}
                  type="button"
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowsClockwise size={16} weight="bold" />
                  Đặt lại
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <FloppyDisk size={16} weight="bold" />
                  {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={`font-bold ${active ? 'text-emerald-600' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
