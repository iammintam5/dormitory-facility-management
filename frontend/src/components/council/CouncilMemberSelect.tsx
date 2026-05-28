import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, UsersResponse } from '../../types/users';
import { apiClient } from '../../lib/axios';
import { useToast } from '../../toast/toast-context';

export interface CouncilMemberState {
  user: User;
  roleInCouncil: string;
}

interface CouncilMemberSelectProps {
  members: CouncilMemberState[];
  onChange: (members: CouncilMemberState[]) => void;
  disabled?: boolean;
}

export function CouncilMemberSelect({ members, onChange, disabled }: CouncilMemberSelectProps) {
  const { showToast } = useToast();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchKeyword.trim() || disabled) return;
    setIsSearching(true);
    try {
      const res = await apiClient.get<UsersResponse>('/users', {
        params: { keyword: searchKeyword, pageSize: 5 },
      });
      const filtered = res.data.items.filter(
        (u) => !members.some((m) => m.user.id === u.id),
      );
      setSearchResults(filtered);
    } catch (error) {
      showToast('Lỗi khi tìm kiếm người dùng.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = (user: User) => {
    if (disabled) return;
    onChange([...members, { user, roleInCouncil: 'Ủy viên' }]);
    setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleRemoveMember = (userId: number) => {
    if (disabled) return;
    onChange(members.filter((m) => m.user.id !== userId));
  };

  const handleRoleChange = (userId: number, role: string) => {
    if (disabled) return;
    onChange(
      members.map((m) => (m.user.id === userId ? { ...m, roleInCouncil: role } : m)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm người dùng (Mã NV, Tên...)"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSearch()}
            disabled={isSearching || !searchKeyword.trim() || disabled}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Người dùng</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {searchResults.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{user.fullName}</div>
                      <div className="text-slate-500">{user.userCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddMember(user)}
                        disabled={disabled}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-900 mb-2">Thành viên hiện tại</h4>
        {members.length === 0 ? (
          <div className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            Chưa có thành viên nào
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">
                    {member.user.fullName}
                  </div>
                  <div className="text-xs text-slate-500">{member.user.userCode}</div>
                </div>
                <div className="w-1/3">
                  <Input
                    placeholder="Chức danh (vd: Trưởng ban)"
                    value={member.roleInCouncil}
                    onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                    required
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                  onClick={() => handleRemoveMember(member.user.id)}
                  disabled={disabled}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
