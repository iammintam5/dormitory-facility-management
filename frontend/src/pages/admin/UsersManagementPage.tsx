import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../lib/api-client';
import {
  createUser,
  getRoles,
  getUsers,
  lockUser,
  resetUserPassword,
  unlockUser,
  updateUser,
  type ManagedUser,
  type UserRoleOption,
} from '../../services/users';
import { useToast } from '../../toast/toast-context';

import { 
  Users,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  LockKey,
  Plus,
  ArrowsClockwise,
  PencilSimple,
  LockOpen,
  Lock,
  Key,
  Spinner
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/Skeleton';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

type UserFormState = {
  roleId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  studentCode: string;
  password: string;
  status: 'ACTIVE' | 'LOCKED';
};

const emptyForm: UserFormState = {
  roleId: '',
  fullName: '',
  username: '',
  email: '',
  phone: '',
  studentCode: '',
  password: '',
  status: 'ACTIVE',
};

const roleLabel: Record<UserRoleOption['code'], string> = {
  ADMIN: 'Admin',
  MANAGER: 'Quản lý CSVC',
  STUDENT: 'Sinh viên',
};

export function UsersManagementPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [keyword, setKeyword] = useState('');
  const [roleCode, setRoleCode] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [roleOptions] = await Promise.all([getRoles()]);
        setRoles(roleOptions);
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải danh sách vai trò.'), 'error');
      }
    }

    void bootstrap();
  }, [showToast]);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      try {
        const response = await getUsers({
          keyword: keyword || undefined,
          roleCode: roleCode === 'ALL' ? undefined : roleCode,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          includeLocked: true,
          page,
          pageSize: 10,
        });
        setUsers(response.items);
        setTotal(response.pagination.total);
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải danh sách tài khoản.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, [keyword, page, roleCode, showToast, statusFilter]);

  const stats = useMemo(() => {
    const totalUsers = total;
    const totalAdmins = users.filter((user) => user.role.code === 'ADMIN').length;
    const totalManagers = users.filter((user) => user.role.code === 'MANAGER').length;
    const totalStudents = users.filter((user) => user.role.code === 'STUDENT').length;
    const lockedUsers = users.filter((user) => user.status === 'LOCKED').length;

    return { totalUsers, totalAdmins, totalManagers, totalStudents, lockedUsers };
  }, [total, users]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setForm({
      roleId: user.role.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email ?? '',
      phone: user.phone ?? '',
      studentCode: user.studentCode ?? '',
      password: '',
      status: user.status === 'LOCKED' ? 'LOCKED' : 'ACTIVE',
    });
    setIsCreateModalOpen(true);
  };

  const saveUser = async () => {
    if (!form.roleId || !form.fullName.trim() || !form.username.trim()) {
      showToast('Vui lòng nhập đủ vai trò, họ tên và tên đăng nhập.', 'error');
      return;
    }

    if (!editingUser && !form.password.trim()) {
      showToast('Mật khẩu là bắt buộc khi tạo mới.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const updated = await updateUser(editingUser.id, {
          roleId: form.roleId,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          studentCode: form.studentCode.trim() || null,
          password: form.password.trim() || undefined,
        });

        if (form.status === 'LOCKED' && updated.status !== 'LOCKED') {
          await lockUser(editingUser.id);
        }
        if (form.status === 'ACTIVE' && updated.status === 'LOCKED') {
          await unlockUser(editingUser.id);
        }

        showToast('Cập nhật tài khoản thành công.', 'success');
      } else {
        const created = await createUser({
          roleId: form.roleId,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          studentCode: form.studentCode.trim() || undefined,
        });

        if (form.status === 'LOCKED') {
          await lockUser(created.id);
        }

        showToast('Thêm tài khoản thành công.', 'success');
      }

      setIsCreateModalOpen(false);
      setForm(emptyForm);
      setPage(1);
      const response = await getUsers({
        keyword: keyword || undefined,
        roleCode: roleCode === 'ALL' ? undefined : roleCode,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        includeLocked: true,
        page: 1,
        pageSize: 10,
      });
      setUsers(response.items);
      setTotal(response.pagination.total);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu tài khoản thất bại.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLock = async (user: ManagedUser) => {
    try {
      if (user.status === 'LOCKED') {
        await unlockUser(user.id);
        showToast('Mở khóa tài khoản thành công.', 'success');
      } else {
        await lockUser(user.id);
        showToast('Khóa tài khoản thành công.', 'success');
      }
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, status: user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' } : item,
        ),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Cập nhật trạng thái tài khoản thất bại.'), 'error');
    }
  };

  const handleResetPassword = async (user: ManagedUser) => {
    const newPassword = window.prompt(`Nhập mật khẩu mới cho ${user.username}`, 'Temp123!');
    if (!newPassword) return;

    try {
      await resetUserPassword(user.id, newPassword);
      showToast('Đặt lại mật khẩu thành công.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Đặt lại mật khẩu thất bại.'), 'error');
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Tài khoản" 
        description="Quản lý và phân quyền cho người dùng hệ thống."
        actions={
          <Button onClick={openCreateModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Thêm tài khoản
          </Button>
        }
      />

      {isLoading && total === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard 
            label="Tổng tài khoản" 
            value={stats.totalUsers} 
            icon={<Users size={24} weight="duotone" />} 
            colorClass="text-blue-600 bg-blue-50 border-blue-100" 
          />
          <SummaryCard 
            label="Admin" 
            value={stats.totalAdmins} 
            icon={<ShieldCheck size={24} weight="duotone" />} 
            colorClass="text-indigo-600 bg-indigo-50 border-indigo-100" 
          />
          <SummaryCard 
            label="Quản lý CSVC" 
            value={stats.totalManagers} 
            icon={<Briefcase size={24} weight="duotone" />} 
            colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" 
          />
          <SummaryCard 
            label="Sinh viên" 
            value={stats.totalStudents} 
            icon={<GraduationCap size={24} weight="duotone" />} 
            colorClass="text-amber-600 bg-amber-50 border-amber-100" 
          />
          <SummaryCard 
            label="Bị khóa" 
            value={stats.lockedUsers} 
            icon={<LockKey size={24} weight="duotone" />} 
            colorClass="text-rose-600 bg-rose-50 border-rose-100" 
          />
        </div>
      )}

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <Input
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="Nhập tên, email hoặc tên đăng nhập..."
            />
          </div>

          <div className="w-full md:w-[150px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vai trò</label>
            <Select
              value={roleCode}
              onChange={(e) => {
                setPage(1);
                setRoleCode(e.target.value);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Quản lý CSVC</option>
              <option value="STUDENT">Sinh viên</option>
            </Select>
          </div>

          <div className="w-full md:w-[150px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Trạng thái</label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </Select>
          </div>

          <div className="flex w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setKeyword('');
                setRoleCode('ALL');
                setStatusFilter('ALL');
                setPage(1);
              }}
              className="gap-2 w-full md:w-auto"
            >
              <ArrowsClockwise size={16} weight="bold" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-5 bg-card">
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">STT</TableHead>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-center w-36">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Không có tài khoản nào.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {(page - 1) * 10 + index + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{user.username}</TableCell>
                    <TableCell className="font-medium text-foreground">{user.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email ?? '--'}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700">
                        {roleLabel[user.role.code]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            user.status === 'LOCKED' ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`font-semibold text-[12px] ${
                            user.status === 'LOCKED' ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {user.status === 'LOCKED' ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditModal(user)} 
                          title="Sửa"
                        >
                          <PencilSimple size={16} className="text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => void toggleLock(user)} 
                          title="Khóa/Mở khóa"
                        >
                          {user.status === 'LOCKED' ? (
                            <LockOpen size={16} className="text-emerald-600" />
                          ) : (
                            <Lock size={16} className="text-amber-500" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => void handleResetPassword(user)} 
                          title="Làm mới mật khẩu"
                        >
                          <Key size={16} className="text-indigo-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / 10))}
          total={total}
          pageSize={10}
          onPageChange={setPage}
          label={`Hiển thị tối đa 10 tài khoản mỗi trang`}
        />
      </Card>

      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title={editingUser ? 'Cập nhật tài khoản' : 'Thêm tài khoản'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
            <Button onClick={() => void saveUser()} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 animate-spin" />}
              Lưu
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-4 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Vai trò *</label>
              <Select
                value={form.roleId}
                onChange={(e) => setForm((current) => ({ ...current, roleId: e.target.value }))}
              >
                <option value="">Chọn vai trò</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {roleLabel[role.code]}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Trạng thái *</label>
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    status: e.target.value as 'ACTIVE' | 'LOCKED',
                  }))
                }
              >
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Họ và tên *</label>
              <Input 
                value={form.fullName} 
                onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} 
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tên đăng nhập *</label>
              <Input 
                value={form.username} 
                onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))} 
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <Input 
                value={form.email} 
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} 
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Số điện thoại</label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} 
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Mã sinh viên</label>
              <Input 
                value={form.studentCode} 
                onChange={(e) => setForm((current) => ({ ...current, studentCode: e.target.value }))} 
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {editingUser ? 'Mật khẩu mới (nếu đổi)' : 'Mật khẩu *'}
              </label>
              <Input 
                type="password" 
                value={form.password} 
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} 
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}


