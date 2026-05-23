import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../auth/auth-context';
import { apiClient } from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/api-error';
import { useToast } from '../../toast/toast-context';
import { Asset } from '../../types/assets';
import { Room } from '../../types/locations';
import { User } from '../../types/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const itemSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  conditionAtHandover: z.string().min(1, 'Nhập tình trạng tài sản.'),
  note: z.string().optional(),
});

const createSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  studentId: z.coerce.number().int().positive(),
  handoverDate: z.string().min(1, 'Chọn ngày bàn giao.'),
  note: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Cần chọn ít nhất một tài sản.'),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function HandoverCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const basePath = user?.role === 'ADMIN' ? '/admin' : '/manager';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      roomId: 1,
      studentId: 1,
      handoverDate: new Date().toISOString().slice(0, 10),
      note: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const roomId = form.watch('roomId');

  useEffect(() => {
    void loadRooms();
  }, []);

  useEffect(() => {
    if (!roomId) return;
    void loadRoomData(roomId);
  }, [roomId]);

  const availableAssets = useMemo(
    () => assets.filter((asset) => !fields.some((field) => field.assetId === asset.id)),
    [assets, fields],
  );

  const loadRooms = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.get<Room[]>('/locations/rooms');
      setRooms(response.data);

      if (response.data[0]) {
        form.setValue('roomId', response.data[0].id);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải danh sách phòng.'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoomData = async (nextRoomId: number) => {
    try {
      const [studentsResponse, assetsResponse] = await Promise.all([
        apiClient.get<User[]>(`/handovers/room-students/${nextRoomId}`),
        apiClient.get<Asset[]>(`/handovers/room-assets/${nextRoomId}`),
      ]);

      setStudents(studentsResponse.data);
      setAssets(assetsResponse.data);
      form.setValue('items', []);

      if (studentsResponse.data[0]) {
        form.setValue('studentId', studentsResponse.data[0].id);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể tải dữ liệu phòng.'));
      setStudents([]);
      setAssets([]);
      form.setValue('items', []);
    }
  };

  const handleAddAsset = () => {
    if (!selectedAssetId) return;

    const asset = assets.find((item) => item.id === Number(selectedAssetId));
    if (!asset) return;

    append({
      assetId: asset.id,
      quantity: 1,
      conditionAtHandover: asset.status === 'IN_USE' ? 'Đang sử dụng' : 'Tốt',
      note: '',
    });
    setSelectedAssetId('');
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/handovers', {
        ...values,
        note: values.note?.trim() || undefined,
        items: values.items.map((item) => ({
          ...item,
          conditionAtHandover: item.conditionAtHandover.trim(),
          note: item.note?.trim() || undefined,
        })),
      });

      showToast('Tạo biên bản bàn giao thành công.');
      navigate(`${basePath}/handovers/${response.data.id}`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể tạo biên bản bàn giao.');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo Biên bản bàn giao</CardTitle>
          <CardDescription>
            Chọn phòng, sinh viên và danh sách tài sản cần bàn giao cho sinh viên.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground animate-pulse">
              Đang tải dữ liệu phòng...
            </div>
          ) : (
            <form className="space-y-8" onSubmit={onSubmit}>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phòng</label>
                  <Select {...form.register('roomId', { valueAsNumber: true })} error={!!form.formState.errors.roomId}>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.roomCode}</option>
                    ))}
                  </Select>
                  {form.formState.errors.roomId && <p className="text-xs text-destructive">{form.formState.errors.roomId.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sinh viên</label>
                  <Select {...form.register('studentId', { valueAsNumber: true })} disabled={students.length === 0} error={!!form.formState.errors.studentId}>
                    {students.length === 0 ? (
                      <option value="">Không có SV ở phòng này</option>
                    ) : (
                      students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.userCode} - {student.fullName}
                        </option>
                      ))
                    )}
                  </Select>
                  {form.formState.errors.studentId && <p className="text-xs text-destructive">{form.formState.errors.studentId.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ngày bàn giao</label>
                  <Input type="date" {...form.register('handoverDate')} error={!!form.formState.errors.handoverDate} />
                  {form.formState.errors.handoverDate && <p className="text-xs text-destructive">{form.formState.errors.handoverDate.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú chung</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register('note')}
                />
              </div>

              <div className="rounded-lg border bg-slate-50/50 p-6">
                <h3 className="mb-4 text-sm font-medium">Danh sách tài sản</h3>
                <div className="flex gap-4">
                  <Select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Chọn tài sản để thêm vào biên bản</option>
                    {availableAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetCode} - {asset.assetName}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" onClick={handleAddAsset} variant="secondary">
                    Thêm tài sản
                  </Button>
                </div>
                {form.formState.errors.items?.root && (
                  <p className="mt-2 text-sm text-destructive">{form.formState.errors.items.root.message}</p>
                )}

                <div className="mt-6 space-y-4">
                  {fields.length === 0 ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Chưa có tài sản nào trong biên bản.
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const asset = assets.find((item) => item.id === field.assetId);
                      return (
                        <div key={field.id} className="relative rounded-lg border bg-white p-4 shadow-sm">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute right-4 top-4"
                            onClick={() => remove(index)}
                          >
                            Xóa
                          </Button>
                          
                          <div className="mb-4 pr-20">
                            <p className="font-semibold">{asset?.assetCode} - {asset?.assetName}</p>
                            <p className="text-sm text-muted-foreground">{asset?.category?.name}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Số lượng</label>
                              <Input
                                type="number"
                                {...form.register(`items.${index}.quantity`)}
                                error={!!form.formState.errors.items?.[index]?.quantity}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Tình trạng</label>
                              <Input
                                {...form.register(`items.${index}.conditionAtHandover`)}
                                error={!!form.formState.errors.items?.[index]?.conditionAtHandover}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Ghi chú</label>
                              <Input {...form.register(`items.${index}.note`)} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isSubmitting || students.length === 0} className="w-40">
                  {isSubmitting ? 'Đang tạo...' : 'Tạo biên bản'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/handovers`)}>
                  Hủy bỏ
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
