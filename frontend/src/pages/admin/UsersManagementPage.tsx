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
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterBar } from '../../components/ui/FilterBar';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { MobileDataCard, DataLabel } from '../../components/ui/MobileDataCard';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { useDebounce } from '../../hooks/useDebounce';

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
  const debouncedKeyword = useDebounce(keyword, 400);
  const [roleCode, setRoleCode] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<ManagedUser | null>(null);
  const [lockTarget, setLockTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('Temp123!');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, roleCode, statusFilter]);

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
          keyword: debouncedKeyword || undefined,
          roleCode: roleCode === 'ALL' ? undefined : roleCode,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          includeLocked: true,
          page,
          pageSize,
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
  }, [debouncedKeyword, page, pageSize, roleCode, showToast, statusFilter]);

  const stats = useMemo(() => {
    const totalUsers = total;
    const totalAdmins = users.filter((user) => user.role.code === 'ADMIN').length;
    const totalManagers = users.filter((user) => user.role.code === 'MANAGER').length;
    const totalStudents = users.filter((user) => user.role.code === 'STUDENT').length;
    const lockedUsers = users.filter((user) => user.status === 'LOCKED').length;

    return { totalUsers, totalAdmins, totalManagers, totalStudents, lockedUsers };
  }, [total, users]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === form.roleId) ?? null,
    [form.roleId, roles],
  );

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

    if (form.password.trim() && form.password.trim().length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    if (selectedRole?.code === 'STUDENT' && !form.studentCode.trim()) {
      showToast('Vui lòng nhập mã sinh viên cho tài khoản Sinh viên.', 'error');
      return;
    }

    const normalizedStudentCode = selectedRole?.code === 'STUDENT'
      ? form.studentCode.trim().toUpperCase()
      : null;

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const updated = await updateUser(editingUser.id, {
          roleId: form.roleId,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          studentCode: normalizedStudentCode,
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
          studentCode: normalizedStudentCode ?? undefined,
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

  const executeToggleLock = async () => {
    if (!lockTarget) return;
    try {
      if (lockTarget.status === 'LOCKED') {
        await unlockUser(lockTarget.id);
        showToast('Mở khóa tài khoản thành công.', 'success');
      } else {
        await lockUser(lockTarget.id);
        showToast('Khóa tài khoản thành công.', 'success');
      }
      setUsers((current) =>
        current.map((item) =>
          item.id === lockTarget.id ? { ...item, status: lockTarget.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' } : item,
        ),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Cập nhật trạng thái tài khoản thất bại.'), 'error');
    } finally {
      setLockTarget(null);
    }
  };

  const executeResetPassword = async () => {
    if (!resetPasswordTarget || !newPassword) return;
    setIsResetting(true);
    try {
      await resetUserPassword(resetPasswordTarget.id, newPassword);
      showToast('Đặt lại mật khẩu thành công.', 'success');
      setResetPasswordTarget(null);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Đặt lại mật khẩu thất bại.'), 'error');
    } finally {
      setIsResetting(false);
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

      <FilterBar 
        searchNode={
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Nhập tên, email hoặc tên đăng nhập..."
            aria-label="Tìm kiếm người dùng"
          />
        }
        filterNode={
          <>
            <Select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              aria-label="Lọc theo vai trò"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Quản lý CSVC</option>
              <option value="STUDENT">Sinh viên</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </Select>
          </>
        }
        appliedFilterCount={[
          roleCode !== 'ALL' ? roleCode : '',
          statusFilter !== 'ALL' ? statusFilter : ''
        ].filter(Boolean).length}
        onResetFilters={() => {
          setKeyword('');
          setRoleCode('ALL');
          setStatusFilter('ALL');
        }}
        filterChips={[
          ...(roleCode !== 'ALL' ? [{ id: 'role', label: `Vai trò: ${roleLabel[roleCode as keyof typeof roleLabel]}`, onRemove: () => setRoleCode('ALL') }] : []),
          ...(statusFilter !== 'ALL' ? [{ id: 'status', label: `Trạng thái: ${statusFilter === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}`, onRemove: () => setStatusFilter('ALL') }] : []),
        ]}
      />

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-5 bg-card">
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : (
          <div className="flex flex-col">
            {users.length === 0 ? (
              <div className="p-10">
                <EmptyState 
                  title="Không tìm thấy tài khoản" 
                  description="Chưa có tài khoản nào phù hợp với bộ lọc hiện tại."
                />
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table aria-label="Danh sách tài khoản">
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
                      {users.map((user, index) => (
                          <TableRow key={user.id}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {(page - 1) * pageSize + index + 1}
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
                                    user.status === 'LOCKED' ? 'bg-destructive' : 'bg-success'
                                  }`}
                                />
                                <span
                                  className={`font-semibold text-[12px] ${
                                    user.status === 'LOCKED' ? 'text-destructive' : 'text-success'
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
                              <RowActionsMenu
                                ariaLabel={`Thao tác tài khoản ${user.username}`}
                                actions={[
                                  { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(user) },
                                  { id: 'reset-pwd', label: 'Làm mới mật khẩu', icon: <Key size={16} />, onClick: () => { setResetPasswordTarget(user); setNewPassword('Temp123!'); } },
                                  { 
                                    id: 'lock', 
                                    label: user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản', 
                                    icon: user.status === 'LOCKED' ? <LockOpen size={16} /> : <Lock size={16} />, 
                                    variant: user.status === 'LOCKED' ? 'default' : 'destructive',
                                    onClick: () => setLockTarget(user)
                                  }
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden flex flex-col gap-3 p-3">
                    {users.map((user) => (
                      <MobileDataCard
                        key={user.id}
                        title={user.fullName}
                        subtitle={user.username}
                        statusBadge={
                          <span
                            className={`inline-flex rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                              user.status === 'LOCKED' ? 'bg-destructive-muted text-destructive' : 'bg-success-muted text-success'
                            }`}
                          >
                            {user.status === 'LOCKED' ? 'Bị khóa' : 'Hoạt động'}
                          </span>
                        }
                        actionMenu={
                          <RowActionsMenu
                            ariaLabel={`Thao tác tài khoản ${user.username}`}
                            actions={[
                              { id: 'edit', label: 'Sửa', icon: <PencilSimple size={16} />, onClick: () => openEditModal(user) },
                              { id: 'reset-pwd', label: 'Làm mới mật khẩu', icon: <Key size={16} />, onClick: () => { setResetPasswordTarget(user); setNewPassword('Temp123!'); } },
                              { 
                                id: 'lock', 
                                label: user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản', 
                                icon: user.status === 'LOCKED' ? <LockOpen size={16} /> : <Lock size={16} />, 
                                variant: user.status === 'LOCKED' ? 'default' : 'destructive',
                                onClick: () => setLockTarget(user) 
                              }
                            ]}
                          />
                        }
                      >
                        <DataLabel label="Vai trò" value={roleLabel[user.role.code]} />
                        <DataLabel label="Email" value={user.email || '--'} />
                      </MobileDataCard>
                    ))}
                  </div>
                </>
              )}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
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
                onChange={(e) => {
                  const nextRole = roles.find((role) => role.id === e.target.value);
                  setForm((current) => ({
                    ...current,
                    roleId: e.target.value,
                    studentCode: nextRole?.code === 'STUDENT' ? current.studentCode : '',
                  }));
                }}
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
                onChange={(e) => setForm((current) => ({ ...current, studentCode: e.target.value.toUpperCase() }))}
                disabled={selectedRole?.code !== 'STUDENT'}
                placeholder={selectedRole?.code === 'STUDENT' ? 'VD: N21DCCN001' : 'Chỉ dùng cho Sinh viên'}
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

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        title="Đặt lại mật khẩu"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetPasswordTarget(null)}>Hủy</Button>
            <Button onClick={executeResetPassword} disabled={isResetting}>
              {isResetting && <Spinner className="mr-2 animate-spin" />}
              Lưu mật khẩu
            </Button>
          </>
        }
      >
        <div className="py-4 pr-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản <strong>{resetPasswordTarget?.username}</strong>.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mật khẩu mới</label>
            <Input 
              type="text" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
          </div>
        </div>
      </Modal>

      {/* Lock/Unlock Confirm Dialog */}
      <AlertDialog
        isOpen={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={lockTarget?.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        description={
          lockTarget?.status === 'LOCKED'
            ? `Bạn có chắc chắn muốn mở khóa tài khoản ${lockTarget?.username}? Người dùng sẽ có thể đăng nhập lại vào hệ thống.`
            : `Bạn có chắc chắn muốn khóa tài khoản ${lockTarget?.username}? Người dùng sẽ không thể đăng nhập vào hệ thống nữa.`
        }
        confirmText={lockTarget?.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
        onConfirm={() => void executeToggleLock()}
      />
    </div>
  );
}


