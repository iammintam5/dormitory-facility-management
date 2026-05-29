import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { Room } from '../../types/locations';
import { useToast } from '../../toast/toast-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CouncilMemberSelect, CouncilMemberState } from '../../components/council/CouncilMemberSelect';

export function InventoryCheckCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [generalNote, setGeneralNote] = useState('');
  const [members, setMembers] = useState<CouncilMemberState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<Room[]>('/locations/rooms');
      setRooms(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách phòng.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/inventory-checks/from-room', {
        roomId: Number(roomId),
        checkDate,
        generalNote: generalNote.trim() || undefined,
        members: members.length > 0 ? members.map(m => ({
          userId: m.user.id,
          roleInCouncil: m.roleInCouncil.trim()
        })) : undefined,
      });

      showToast('Tạo phiếu kiểm kê thành công.');
      navigate(`${basePath}/inventory-checks/${response.data.id}`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo phiếu kiểm kê.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phiếu kiểm kê</CardTitle>
          <CardDescription>
            Chọn phòng cần kiểm kê. Hệ thống sẽ tự động lấy danh sách tài sản hiện có trong phòng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground animate-pulse">
              Đang tải danh sách phòng...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phòng kiểm kê</label>
                <Select
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomCode}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày kiểm kê</label>
                <Input
                  type="date"
                  value={checkDate}
                  onChange={(event) => setCheckDate(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú chung</label>
                <textarea
                  value={generalNote}
                  onChange={(event) => setGeneralNote(event.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  placeholder="Mô tả phạm vi kiểm kê hoặc ghi chú bổ sung nếu cần."
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium">Hội đồng kiểm kê (Tùy chọn)</h3>
                <p className="text-sm text-slate-500 mb-4">Bạn có thể chọn hội đồng ngay bây giờ hoặc cập nhật sau khi tạo phiếu.</p>
                <CouncilMemberSelect 
                  members={members} 
                  onChange={setMembers} 
                  disabled={isSubmitting} 
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" disabled={isSubmitting || !roomId} className="w-40">
                  {isSubmitting ? 'Đang tạo phiếu...' : 'Tạo phiếu kiểm kê'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`${basePath}/inventory-checks`)}
                >
                  Quay lại danh sách
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
