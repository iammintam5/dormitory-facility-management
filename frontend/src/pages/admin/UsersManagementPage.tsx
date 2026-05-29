import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { formatDateTime } from '../../lib/format';
import { Role, User, UsersResponse } from '../../types/users';

const userFormSchema = z.object({
  roleId: z.coerce.number().int().positive(),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên.'),
  userCode: z.string().min(1, 'Vui lòng nhập mã người dùng.'),
  email: z.string().email('Email không hợp lệ.').or(z.literal('')).optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự.').optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const defaultValues: UserFormValues = {
  roleId: 3,
  fullName: '',
  userCode: '',
  email: '',
  phone: '',
  password: '',
};

export function UsersManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [status, setStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  useEffect(() => {
    void Promise.all([fetchRoles(), fetchUsers(1)]);
  }, []);

  const fetchRoles = async () => {
    const response = await apiClient.get<Role[]>('/users/roles');
    setRoles(response.data);
  };

  const fetchUsers = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<UsersResponse>('/users', {
        params: {
          page: nextPage,
          pageSize,
          keyword: keyword || undefined,
          roleCode: roleCode || undefined,
          status: status || undefined,
          includeLocked: true,
        },
      });

      setUsers(response.data.items);
      setPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách người dùng.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    setFeedback('');
    setErrorMessage('');

    try {
      const payload = {
        ...values,
        email: values.email?.trim() ? values.email.trim() : undefined,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        password: values.password?.trim() ? values.password : undefined,
      };

      if (selectedUser) {
        await apiClient.patch(`/users/${selectedUser.id}`, payload);
        setFeedback('Cập nhật tài khoản thành công.');
      } else {
        await apiClient.post('/users', {
          ...payload,
          password: values.password || 'student123',
        });
        setFeedback('Tạo tài khoản thành công.');
      }

      reset(defaultValues);
      setSelectedUser(null);
      await fetchUsers(selectedUser ? page : 1);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể lưu tài khoản.'));
    } finally {
      setIsSaving(false);
    }
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFeedback('');
    setErrorMessage('');
    reset({
      roleId: user.role.id,
      fullName: user.fullName,
      userCode: user.userCode,
      email: user.email ?? '',
      phone: user.phone ?? '',
      password: '',
    });
  };

  const handleCancelEdit = () => {
    setSelectedUser(null);
    reset(defaultValues);
    setFeedback('');
    setErrorMessage('');
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await apiClient.patch(`/users/${user.id}/status`, {
        status: user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
      });
      await fetchUsers(page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể cập nhật trạng thái tài khoản.'));
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Quản lý người dùng"
        description="Tạo tài khoản, cập nhật thông tin, khóa mở và gán role cho người dùng."
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1.85fr]">
          <form className="space-y-4 rounded-2xl bg-slate-50 p-4" onSubmit={onSubmit}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}
              </h3>
              {selectedUser && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            <Field label="Họ tên" error={errors.fullName?.message}>
              <input {...register('fullName')} className={inputClassName} />
            </Field>

            <Field label="Mã người dùng" error={errors.userCode?.message}>
              <input {...register('userCode')} className={inputClassName} />
            </Field>

            <Field label="Role" error={errors.roleId?.message}>
              <select {...register('roleId')} className={inputClassName}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.code} - {role.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} className={inputClassName} />
            </Field>

            <Field label="Số điện thoại" error={errors.phone?.message}>
              <input {...register('phone')} className={inputClassName} />
            </Field>

            <Field
              label={selectedUser ? 'Mật khẩu mới (nếu đổi)' : 'Mật khẩu'}
              error={errors.password?.message}
            >
              <input type="password" {...register('password')} className={inputClassName} />
            </Field>

            {feedback && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
            {errorMessage && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? 'Đang lưu...' : selectedUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className={inputClassName}
                placeholder="Tìm theo tên, mã, email..."
              />
              <select value={roleCode} onChange={(event) => setRoleCode(event.target.value)} className={inputClassName}>
                <option value="">Tất cả role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.code}
                  </option>
                ))}
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}>
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="LOCKED">LOCKED</option>
              </select>
              <button
                type="button"
                onClick={() => void fetchUsers(1)}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Lọc dữ liệu
              </button>
            </div>

            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                Đang tải dữ liệu người dùng...
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                title="Chưa có người dùng phù hợp"
                description="Thay đổi bộ lọc hoặc tạo tài khoản mới ở khung bên trái."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Người dùng</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Trạng thái</th>
                        <th className="px-4 py-3 font-medium">Lần đăng nhập</th>
                        <th className="px-4 py-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{user.fullName}</p>
                            <p className="text-slate-600">{user.userCode}</p>
                            <p className="text-slate-500">{user.email || '--'}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{user.role.code}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                user.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(user)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleStatus(user)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4">
                  <PaginationBar page={page} totalPages={totalPages} total={total} onPageChange={(next) => void fetchUsers(next)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500';
