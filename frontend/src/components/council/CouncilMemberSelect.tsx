import React, { useState } from 'react';
import { getUsers } from '../../services/users';
import { User } from '../../types/users';
import { useToast } from '../../toast/toast-context';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface CouncilMemberState {
  user: User;
  roleInCouncil: string;
}

interface CouncilMemberSelectProps {
  members: CouncilMemberState[];
  onChange: (members: CouncilMemberState[]) => void;
  disabled?: boolean;
}

export function CouncilMemberSelect({
  members,
  onChange,
  disabled,
}: CouncilMemberSelectProps) {
  const { showToast } = useToast();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchKeyword.trim() || disabled) return;
    setIsSearching(true);

    try {
      const response = await getUsers({ keyword: searchKeyword, pageSize: 20 });
      // Transform API response to User[] format
      const results: User[] = response.items.map((u) => ({
        id: Number(u.id),
        fullName: u.fullName,
        userCode: u.username,
        email: u.email ?? undefined,
        phone: u.phone ?? undefined,
        status: u.status,
        createdAt: u.createdAt,
        role: {
          ...u.role,
          id: Number(u.role.id),
        },
      }));
      setSearchResults(results.filter((user) => !members.some((member) => member.user.id === user.id)));
    } catch {
      showToast('Không thể tìm kiếm thành viên hội đồng.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = (user: User) => {
    if (disabled) return;
    onChange([...members, { user, roleInCouncil: 'Ủy viên' }]);
    setSearchResults((current) => current.filter((item) => item.id !== user.id));
  };

  const handleRemoveMember = (userId: number) => {
    if (disabled) return;
    onChange(members.filter((member) => member.user.id !== userId));
  };

  const handleRoleChange = (userId: number, roleInCouncil: string) => {
    if (disabled) return;
    onChange(
      members.map((member) =>
        member.user.id === userId ? { ...member, roleInCouncil } : member,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm người dùng theo mã hoặc tên"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Người dùng</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {searchResults.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="font-medium text-foreground">{user.fullName}</div>
                      <div className="text-muted-foreground">{user.userCode}</div>
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
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
        <h4 className="mb-2 text-sm font-medium text-foreground">Thành viên hiện tại</h4>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-4 text-center text-sm italic text-muted-foreground">
            Chưa có thành viên nào
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{member.user.fullName}</div>
                  <div className="text-xs text-muted-foreground">{member.user.userCode}</div>
                </div>
                <div className="w-1/3">
                  <Input
                    placeholder="Vai trò trong hội đồng"
                    value={member.roleInCouncil}
                    onChange={(event) => handleRoleChange(member.user.id, event.target.value)}
                    required
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleRemoveMember(member.user.id)}
                  disabled={disabled}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
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
