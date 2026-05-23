import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '../../components/admin/EmptyState';
import { SectionCard } from '../../components/admin/SectionCard';
import { apiClient } from '../../lib/axios';
import { formatDate } from '../../lib/format';
import { DormBlock, Floor, Room, RoomStudentAssignment } from '../../types/locations';
import { User } from '../../types/users';

const blockSchema = z.object({
  code: z.string().min(1, 'Nhap ma khu.'),
  name: z.string().min(1, 'Nhap ten khu.'),
});

const floorSchema = z.object({
  blockId: z.coerce.number().int().positive(),
  floorNumber: z.coerce.number().int().positive(),
  name: z.string().optional(),
});

const roomSchema = z.object({
  floorId: z.coerce.number().int().positive(),
  roomCode: z.string().min(1, 'Nhap ma phong.'),
  capacity: z.coerce.number().int().positive().optional(),
  note: z.string().optional(),
});

const assignSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  startDate: z.string().min(1, 'Chon ngay bat dau.'),
});

type BlockFormValues = z.infer<typeof blockSchema>;
type FloorFormValues = z.infer<typeof floorSchema>;
type RoomFormValues = z.infer<typeof roomSchema>;
type AssignFormValues = z.infer<typeof assignSchema>;

export function LocationsManagementPage() {
  const [blocks, setBlocks] = useState<DormBlock[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<number, RoomStudentAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const blockForm = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: { code: '', name: '' },
  });
  const floorForm = useForm<FloorFormValues>({
    resolver: zodResolver(floorSchema),
    defaultValues: { blockId: 1, floorNumber: 1, name: '' },
  });
  const roomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { floorId: 1, roomCode: '', capacity: 4, note: '' },
  });
  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { studentId: 3, startDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [blocksResponse, floorsResponse, roomsResponse, studentsResponse] = await Promise.all([
        apiClient.get<DormBlock[]>('/locations/blocks'),
        apiClient.get<Floor[]>('/locations/floors'),
        apiClient.get<Room[]>('/locations/rooms'),
        apiClient.get<{ items: User[] }>('/users', {
          params: {
            roleCode: 'STUDENT',
            includeLocked: true,
            pageSize: 100,
          },
        }),
      ]);

      setBlocks(blocksResponse.data);
      setFloors(floorsResponse.data);
      setRooms(roomsResponse.data);
      setStudents(studentsResponse.data.items);
      setRoomAssignments(
        Object.fromEntries(
          roomsResponse.data.map((room) => [room.id, room.roomStudents ?? []]),
        ),
      );

      if (blocksResponse.data[0]) {
        floorForm.setValue('blockId', blocksResponse.data[0].id);
      }

      if (floorsResponse.data[0]) {
        roomForm.setValue('floorId', floorsResponse.data[0].id);
      }

      if (studentsResponse.data.items[0]) {
        assignForm.setValue('studentId', studentsResponse.data.items[0].id);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai du lieu khu tang phong.'));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRoomStudents = async (roomId: number) => {
    const response = await apiClient.get<RoomStudentAssignment[]>(`/locations/rooms/${roomId}/students`);
    setRoomAssignments((prev) => ({
      ...prev,
      [roomId]: response.data,
    }));
  };

  const submitBlock = blockForm.handleSubmit(async (values) => {
    await submitWithFeedback(async () => {
      await apiClient.post('/locations/blocks', values);
      blockForm.reset({ code: '', name: '' });
      await loadAll();
    }, 'Tao khu thanh cong.');
  });

  const submitFloor = floorForm.handleSubmit(async (values) => {
    await submitWithFeedback(async () => {
      await apiClient.post('/locations/floors', values);
      floorForm.reset({ ...values, floorNumber: values.floorNumber + 1, name: '' });
      await loadAll();
    }, 'Tao tang thanh cong.');
  });

  const submitRoom = roomForm.handleSubmit(async (values) => {
    await submitWithFeedback(async () => {
      await apiClient.post('/locations/rooms', values);
      roomForm.reset({ ...values, roomCode: '', note: '' });
      await loadAll();
    }, 'Tao phong thanh cong.');
  });

  const submitAssignment = assignForm.handleSubmit(async (values) => {
    const roomId = rooms[0]?.id;

    if (!roomId) {
      setErrorMessage('Can co it nhat mot phong de gan sinh vien.');
      return;
    }

    await submitWithFeedback(async () => {
      await apiClient.post(`/locations/rooms/${roomId}/students`, values);
      await loadAll();
      await refreshRoomStudents(roomId);
    }, 'Gan sinh vien vao phong thanh cong.');
  });

  const handleDelete = async (type: 'blocks' | 'floors' | 'rooms', id: number) => {
    await submitWithFeedback(async () => {
      await apiClient.delete(`/locations/${type}/${id}`);
      await loadAll();
    }, 'Xoa du lieu thanh cong.');
  };

  return (
    <div className="space-y-6">
      {(feedback || errorMessage) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            errorMessage ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {errorMessage || feedback}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Tao khu" description="Them khu ky tuc xa moi de to chuc cau truc toa nha.">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitBlock}>
            <InputField label="Ma khu" error={blockForm.formState.errors.code?.message}>
              <input {...blockForm.register('code')} className={inputClassName} />
            </InputField>
            <InputField label="Ten khu" error={blockForm.formState.errors.name?.message}>
              <input {...blockForm.register('name')} className={inputClassName} />
            </InputField>
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Tao khu
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Tao tang" description="Gan tang vao khu tuong ung voi so tang duy nhat trong tung khu.">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={submitFloor}>
            <InputField label="Khu" error={floorForm.formState.errors.blockId?.message}>
              <select {...floorForm.register('blockId')} className={inputClassName}>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.code} - {block.name}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="So tang" error={floorForm.formState.errors.floorNumber?.message}>
              <input type="number" {...floorForm.register('floorNumber')} className={inputClassName} />
            </InputField>
            <InputField label="Ten tang" error={floorForm.formState.errors.name?.message}>
              <input {...floorForm.register('name')} className={inputClassName} />
            </InputField>
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Tao tang
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Tao phong" description="Phong duoc tao theo tung tang, co suc chua va ghi chu tuy chon.">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submitRoom}>
            <InputField label="Tang" error={roomForm.formState.errors.floorId?.message}>
              <select {...roomForm.register('floorId')} className={inputClassName}>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.block?.code ?? 'Khu'} - Tang {floor.floorNumber}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="Ma phong" error={roomForm.formState.errors.roomCode?.message}>
              <input {...roomForm.register('roomCode')} className={inputClassName} />
            </InputField>
            <InputField label="Suc chua" error={roomForm.formState.errors.capacity?.message}>
              <input type="number" {...roomForm.register('capacity')} className={inputClassName} />
            </InputField>
            <InputField label="Ghi chu" error={roomForm.formState.errors.note?.message}>
              <input {...roomForm.register('note')} className={inputClassName} />
            </InputField>
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Tao phong
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Gan sinh vien vao phong" description="Ban demo nhanh hien dang gan vao phong dau tien trong danh sach.">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={submitAssignment}>
            <InputField label="Phong dich">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {rooms[0] ? `${rooms[0].roomCode} - Tang ${rooms[0].floor?.floorNumber ?? '--'}` : 'Chua co phong'}
              </div>
            </InputField>
            <InputField label="Sinh vien" error={assignForm.formState.errors.studentId?.message}>
              <select {...assignForm.register('studentId')} className={inputClassName}>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.userCode} - {student.fullName}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="Ngay bat dau" error={assignForm.formState.errors.startDate?.message}>
              <input type="date" {...assignForm.register('startDate')} className={inputClassName} />
            </InputField>
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Gan sinh vien
            </button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Cau truc khu / tang / phong" description="Theo doi nhanh cau truc dia diem va danh sach sinh vien trong phong.">
        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            Dang tai du lieu locations...
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            title="Chua co phong nao"
            description="Hay tao khu, tang va phong o cac bieu mau ben tren de bat dau."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <SummaryCard label="So khu" value={String(blocks.length)} />
              <SummaryCard label="So tang" value={String(floors.length)} />
              <SummaryCard label="So phong" value={String(rooms.length)} />
            </div>

            <div className="space-y-4">
              {rooms.map((room) => (
                <article key={room.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {room.roomCode} - {room.floor?.block?.name ?? 'Khu'} / Tang {room.floor?.floorNumber ?? '--'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Suc chua: {room.capacity ?? '--'} | Ghi chu: {room.note || '--'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete('rooms', room.id)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Xoa phong
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="text-left text-slate-600">
                        <tr>
                          <th className="py-2 pr-4 font-medium">Sinh vien</th>
                          <th className="py-2 pr-4 font-medium">Ma</th>
                          <th className="py-2 pr-4 font-medium">Ngay vao</th>
                          <th className="py-2 font-medium">Trang thai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(roomAssignments[room.id] ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-slate-500">
                              Chua co sinh vien nao trong phong.
                            </td>
                          </tr>
                        ) : (
                          (roomAssignments[room.id] ?? []).map((assignment) => (
                            <tr key={assignment.id}>
                              <td className="py-3 pr-4 font-medium text-slate-900">
                                {assignment.student.fullName}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">{assignment.student.userCode}</td>
                              <td className="py-3 pr-4 text-slate-600">{formatDate(assignment.startDate)}</td>
                              <td className="py-3">
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  Dang o
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SimpleListCard
                title="Danh sach khu"
                items={blocks}
                renderLabel={(block) => `${block.code} - ${block.name}`}
                onDelete={(block) => void handleDelete('blocks', block.id)}
              />
              <SimpleListCard
                title="Danh sach tang"
                items={floors}
                renderLabel={(floor) =>
                  `${floor.block?.name ?? 'Khu'} - Tang ${floor.floorNumber}${floor.name ? ` (${floor.name})` : ''}`
                }
                onDelete={(floor) => void handleDelete('floors', floor.id)}
              />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );

  async function submitWithFeedback(action: () => Promise<void>, successMessage: string) {
    setFeedback('');
    setErrorMessage('');

    try {
      await action();
      setFeedback(successMessage);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Thao tac that bai.'));
    }
  }
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SimpleListCard<T extends { id: number }>({
  title,
  items,
  renderLabel,
  onDelete,
}: {
  title: string;
  items: T[];
  renderLabel: (item: T) => string;
  onDelete: (item: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-700">{renderLabel(item)}</span>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Xoa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputField({
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
