import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Door, 
  Buildings, 
  Users, 
  CheckCircle,
  ShieldCheck,
  Broom,
  Prohibit,
  Lightbulb,
  SpeakerHigh,
  Plug,
  ListDashes,
  UserCircle,
  Spinner
} from '@phosphor-icons/react';
import { getMockStudentAssets, getMockRoomStudents } from '../../lib/frontend-mock';
import { Room } from '../../types/locations';
import { User } from '../../types/users';

export function StudentRoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [roommates, setRoommates] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMockStudentAssets();
        setRoom(data.room);
        if (data.room) {
          const students = await getMockRoomStudents(data.room.id);
          setRoommates(students);
        }
      } catch {
        // silent fallback
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Không tìm thấy thông tin phòng
      </div>
    );
  }

  const building = room.floor?.building;
  const capacity = room.capacity ?? 6;
  const currentCount = roommates.length;
  const isFull = currentCount >= capacity;

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Phòng của tôi" 
        breadcrumbs={[
          { label: 'Trang chủ', href: '/student/dashboard' },
          { label: 'Phòng của tôi' }
        ]}
      />

      {/* Thông tin phòng Banner */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2">
            <Door size={20} className="text-primary" weight="bold" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Thông tin phòng</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-7 grid grid-cols-2 md:grid-cols-6 gap-6 divide-x divide-border/50">
          <div className="flex flex-col items-center justify-center text-center px-5 pt-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Buildings size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Khu nhà</p>
            <p className="text-xl font-bold text-foreground">{building?.code || 'A'}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center px-5 pt-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Door size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phòng</p>
            <p className="text-xl font-bold text-foreground">{room.roomCode}</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center px-5 pt-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center mb-3">
              <Users size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Loại phòng</p>
            <p className="text-base font-bold text-foreground">{capacity} sinh viên</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center px-5 pt-2">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
              <Users size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sức chứa</p>
            <p className="text-xl font-bold text-foreground">{capacity}</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center px-5 pt-2">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3">
              <UserCircle size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Đang ở</p>
            <p className="text-xl font-bold text-foreground">{currentCount}{isFull ? '' : ` / ${capacity}`}</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Trạng thái</p>
            <div className="mt-1">
              <Badge variant="success">{isFull ? 'Đầy' : 'Còn chỗ'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danh sách bạn cùng phòng */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" weight="bold" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Danh sách bạn cùng phòng</CardTitle>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto p-6">
          {roommates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Chưa có sinh viên nào trong phòng này.</div>
          ) : (
            <>
              <table className="w-full text-sm text-left mb-6">
                <thead className="text-muted-foreground font-semibold border-b border-border/50">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã sinh viên</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-foreground">
                  {roommates.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-medium">{student.userCode}</td>
                      <td className="py-3.5 px-4 font-semibold">{student.fullName}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{student.email || '-'}</td>
                      <td className="py-3.5 px-4">
                        {idx === 0 ? (
                          <Badge variant="success">Trưởng phòng</Badge>
                        ) : (
                          <Badge variant="secondary">Thành viên</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-primary/5 rounded-lg p-4 flex items-start gap-3 border border-primary/20">
                <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" weight="fill" />
                <p className="text-sm text-foreground font-medium leading-relaxed">
                  Vui lòng phối hợp cùng các bạn giữ gìn vệ sinh và tài sản chung.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Nội quy phòng */}
      <Card className="border-border/50">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2">
            <ListDashes size={20} className="text-primary" weight="bold" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Nội quy phòng</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Broom size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Giữ gìn vệ sinh chung, dọn dẹp phòng thường xuyên.</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <Prohibit size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Không hút thuốc, uống rượu bia trong phòng.</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Tiết kiệm điện, nước và các tài sản trong phòng.</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <SpeakerHigh size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Không gây mất trật tự, ảnh hưởng đến người khác.</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <Plug size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Không sử dụng thiết bị điện công suất lớn.</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} weight="bold" />
              </div>
              <span className="text-sm font-medium text-foreground leading-snug pt-1.5">Tuân thủ nội quy chung của ký túc xá.</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-6 flex flex-col items-center justify-center text-center border border-emerald-500/20">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck size={32} weight="duotone" />
            </div>
            <p className="text-sm text-emerald-700 font-bold leading-relaxed">
              Cùng nhau xây dựng môi trường sống văn minh, sạch sẽ và an toàn.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
