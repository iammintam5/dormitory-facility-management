import { useEffect, useRef, useState } from 'react';
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
    avatarUrl: user?.profile?.avatarUrl ?? '',
    dob: user?.profile?.dateOfBirth ? user.profile.dateOfBirth.slice(0, 10) : '',
    gender: user?.profile?.gender ?? 'Nam',
    address: user?.profile?.address ?? '',
    notes: user?.profile?.notes ?? '',
  };

  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [dob, setDob] = useState(initialProfile.dob);
  const [gender, setGender] = useState(initialProfile.gender);
  const [address, setAddress] = useState(initialProfile.address);
  const [notes, setNotes] = useState(initialProfile.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function bootstrapProfile() {
      try {
        const profile = await getMyProfile();
        setFullName(profile.fullName);
        setEmail(profile.email ?? '');
        setPhone(profile.phone ?? '');
        setAvatarUrl(profile.profile?.avatarUrl ?? '');
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
        avatarUrl: avatarUrl || null,
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
    setAvatarUrl(initialProfile.avatarUrl);
    setDob(initialProfile.dob);
    setGender(initialProfile.gender);
    setAddress(initialProfile.address);
    setNotes(initialProfile.notes);
    showToast('Đã khôi phục thông tin ban đầu.');
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh.', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ảnh đại diện cần nhỏ hơn 2MB.', 'error');
      event.target.value = '';
      return;
    }

    try {
      const nextAvatarUrl = await prepareAvatarDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
      showToast('Đã chọn ảnh đại diện. Nhấn cập nhật để lưu.');
    } catch {
      showToast('Không thể xử lý ảnh đại diện này. Vui lòng chọn ảnh khác.', 'error');
    } finally {
      event.target.value = '';
    }
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <User size={80} weight="fill" className="text-primary/40 mt-4" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
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

async function prepareAvatarDataUrl(file: File) {
  if (file.type === 'image/gif' && file.size <= 512 * 1024) {
    return readFileAsDataUrl(file);
  }

  const image = await loadImage(file);
  const maxSize = 256;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Invalid file result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Cannot read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Cannot load image'));
    };
    image.src = objectUrl;
  });
}
