import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { EmptyState } from '../../components/admin/EmptyState';
import { SectionCard } from '../../components/admin/SectionCard';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../lib/axios';
import { formatDate } from '../../lib/format';
import { DormBuilding, Floor, Room, RoomStudentAssignment } from '../../types/locations';
import { User } from '../../types/users';

const buildingSchema = z.object({
  code: z.string().min(1, 'Nhap ma khu.'),
  name: z.string().optional(),
});

const floorSchema = z.object({
  buildingId: z.coerce.number().int().positive(),
  floorNumber: z.coerce.number().int().positive(),
  name: z.string().optional(),
});

const roomSchema = z.object({
  floorId: z.coerce.number().int().positive(),
  roomCode: z.string().min(1, 'Nhap ma phong.'),
  capacity: z.coerce.number().int().positive().optional(),
  note: z.string().optional(),
});

const bulkRoomSchema = z.object({
  floorId: z.coerce.number().int().positive(),
  prefix: z.string().min(1, 'Nhap tien to.'),
  startNumber: z.coerce.number().int().min(1),
  endNumber: z.coerce.number().int().min(1),
  capacity: z.coerce.number().int().positive().optional(),
  note: z.string().optional(),
}).refine(data => data.endNumber >= data.startNumber, {
  message: "So ket thuc phai lon hon hoac bang so bat dau",
  path: ["endNumber"],
});

const assignSchema = z.object({
  studentInput: z.string().min(1, 'Gõ Mã SV hoặc Tên để chọn.'),
  startDate: z.string().min(1, 'Chon ngay bat dau.'),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;
type FloorFormValues = z.infer<typeof floorSchema>;
type RoomFormValues = z.infer<typeof roomSchema>;
type BulkRoomFormValues = z.infer<typeof bulkRoomSchema>;
type AssignFormValues = z.infer<typeof assignSchema>;

export function LocationsManagementPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'structure' | 'students'>('structure');

  // Data State
  const [buildings, setBuildings] = useState<DormBuilding[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<number, RoomStudentAssignment[]>>({});

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);

  // Split-Pane State (Structure)
  const [expandedBuildingId, setExpandedBuildingId] = useState<number | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  // Modal State
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<DormBuilding | null>(null);

  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [isBulkRoomModalOpen, setIsBulkRoomModalOpen] = useState(false);

  // Drill-down State (Assign Tab)
  const [assignFilterBuildingId, setAssignFilterBuildingId] = useState<number | ''>('');
  const [assignFilterFloorId, setAssignFilterFloorId] = useState<number | ''>('');
  const [assignFilterRoomId, setAssignFilterRoomId] = useState<number | ''>('');
  const [expandedAssignRoomId, setExpandedAssignRoomId] = useState<number | null>(null);

  const buildingForm = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { code: '', name: '' },
  });
  const floorForm = useForm<FloorFormValues>({
    resolver: zodResolver(floorSchema),
    defaultValues: { buildingId: 1, floorNumber: 1, name: '' },
  });
  const roomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { floorId: 1, roomCode: '', capacity: 8, note: '' },
  });
  const bulkRoomForm = useForm<BulkRoomFormValues>({
    resolver: zodResolver(bulkRoomSchema),
    defaultValues: { floorId: 1, prefix: '', startNumber: 1, endNumber: 10, capacity: 8, note: '' },
  });
  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { studentInput: '', startDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);

    try {
      const [buildingsResponse, floorsResponse, roomsResponse, studentsResponse] = await Promise.all([
        apiClient.get<DormBuilding[]>('/locations/buildings'),
        apiClient.get<Floor[]>('/locations/floors'),
        apiClient.get<Room[]>('/locations/rooms'),
        apiClient.get<{ items: User[] }>('/users', {
          params: { roleCode: 'STUDENT', includeLocked: true, pageSize: 100 },
        }),
      ]);

      setBuildings(buildingsResponse.data);
      setFloors(floorsResponse.data);
      setRooms(roomsResponse.data);
      setStudents(studentsResponse.data.items);
      setRoomAssignments(
        Object.fromEntries(
          roomsResponse.data.map((room) => [room.id, room.roomStudents ?? []]),
        ),
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải dữ liệu khu, tầng, phòng.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const roomsOfSelectedFloor = useMemo(() =>
    rooms.filter(r => r.floorId === selectedFloorId),
    [rooms, selectedFloorId]);

  // Modal Handlers
  const handleOpenBuildingModal = (building?: DormBuilding) => {
    setSelectedBuilding(building || null);
    if (building) {
      buildingForm.reset({ code: building.code, name: building.name });
    } else {
      buildingForm.reset({ code: '', name: '' });
    }
    setIsBuildingModalOpen(true);
  };

  const handleOpenFloorModal = (buildingId: number, floor?: Floor) => {
    setSelectedFloor(floor || null);
    if (floor) {
      floorForm.reset({ buildingId: floor.buildingId, floorNumber: floor.floorNumber, name: floor.name || '' });
    } else {
      const buildingFloors = floors.filter(f => f.buildingId === buildingId);
      const nextFloorNum = buildingFloors.length > 0 ? Math.max(...buildingFloors.map(f => f.floorNumber)) + 1 : 1;
      floorForm.reset({ buildingId, floorNumber: nextFloorNum, name: '' });
    }
    setIsFloorModalOpen(true);
  };

  const handleOpenRoomModal = (floorId: number, room?: Room) => {
    setSelectedRoom(room || null);
    if (room) {
      roomForm.reset({ floorId: room.floorId, roomCode: room.roomCode, capacity: room.capacity || 8, note: room.note || '' });
    } else {
      const floor = floors.find(f => f.id === floorId);
      let prefix = '';
      if (floor) {
        const building = buildings.find(b => b.id === floor.buildingId);
        if (building) prefix = `${building.code}-${floor.floorNumber}`;
      }
      roomForm.reset({ floorId, roomCode: prefix, capacity: 8, note: '' });
    }
    setIsRoomModalOpen(true);
  };

  const handleOpenBulkRoomModal = (floorId: number) => {
    const floor = floors.find(f => f.id === floorId);
    let prefix = '';
    let nextStart = 1;
    if (floor) {
      const building = buildings.find(b => b.id === floor.buildingId);
      if (building) prefix = `${building.code}-${floor.floorNumber}`;
      const currentRoomsCount = rooms.filter(r => r.floorId === floorId).length;
      nextStart = currentRoomsCount + 1;
    }
    bulkRoomForm.reset({ floorId, prefix, startNumber: nextStart, endNumber: nextStart + 9, capacity: 8, note: '' });
    setIsBulkRoomModalOpen(true);
  };


  // Assignment Tab Memos
  const assignFloors = useMemo(() => floors.filter(f => assignFilterBuildingId ? f.buildingId === assignFilterBuildingId : true), [floors, assignFilterBuildingId]);
  const assignRooms = useMemo(() => {
    if (assignFilterFloorId) return rooms.filter(r => r.floorId === assignFilterFloorId);
    if (assignFilterBuildingId) {
      const validFloorIds = new Set(assignFloors.map(f => f.id));
      return rooms.filter(r => validFloorIds.has(r.floorId));
    }
    return rooms;
  }, [rooms, assignFilterFloorId, assignFilterBuildingId, assignFloors]);

  // Submit Handlers
  const submitBuilding = buildingForm.handleSubmit(async (values) => {
    if (!values.name || values.name.trim() === '') {
      values.name = values.code;
    }
    await submitWithFeedback(async () => {
      if (selectedBuilding) {
        const res = await apiClient.patch<DormBuilding>(`/locations/buildings/${selectedBuilding.id}`, values);
        setBuildings(prev => prev.map(b => b.id === selectedBuilding.id ? res.data : b));
      } else {
        const res = await apiClient.post<DormBuilding>('/locations/buildings', values);
        setBuildings(prev => [...prev, res.data]);
        setExpandedBuildingId(res.data.id);
      }
      setIsBuildingModalOpen(false);
    }, selectedBuilding ? 'Cập nhật Khu thành công.' : 'Tạo Khu thành công.');
  });

  const submitFloor = floorForm.handleSubmit(async (values) => {
    if (!values.name || values.name.trim() === '') {
      delete values.name;
    }
    await submitWithFeedback(async () => {
      if (selectedFloor) {
        const res = await apiClient.patch<Floor>(`/locations/floors/${selectedFloor.id}`, values);
        setFloors(prev => prev.map(f => f.id === selectedFloor.id ? res.data : f));
      } else {
        const res = await apiClient.post<Floor>('/locations/floors', values);
        setFloors(prev => [...prev, res.data]);
        setSelectedFloorId(res.data.id);
      }
      setIsFloorModalOpen(false);
    }, selectedFloor ? 'Cập nhật Tầng thành công.' : 'Tạo Tầng thành công.');
  });

  const submitRoom = roomForm.handleSubmit(async (values) => {
    await submitWithFeedback(async () => {
      if (selectedRoom) {
        const res = await apiClient.patch<Room>(`/locations/rooms/${selectedRoom.id}`, values);
        setRooms(prev => prev.map(r => r.id === selectedRoom.id ? res.data : r));
      } else {
        const res = await apiClient.post<Room>('/locations/rooms', values);
        setRooms(prev => [...prev, res.data]);
      }
      setIsRoomModalOpen(false);
    }, selectedRoom ? 'Cập nhật Phòng thành công.' : 'Tạo Phòng thành công.');
  });

  const submitBulkRoom = bulkRoomForm.handleSubmit(async (values) => {
    setIsGenerating(true);
    let successCount = 0;

    try {
      const newRooms: Room[] = [];
      try {
        for (let i = values.startNumber; i <= values.endNumber; i++) {
          const paddedNum = i < 10 ? `0${i}` : `${i}`;
          const roomCode = `${values.prefix}${paddedNum}`;
          const res = await apiClient.post<Room>('/locations/rooms', {
            floorId: values.floorId,
            roomCode: roomCode,
            capacity: values.capacity,
            note: values.note
          });
          newRooms.push(res.data);
          successCount++;
        }
        setRooms(prev => [...prev, ...newRooms]);
        showToast(`Đã tạo thành công ${successCount} phòng.`, 'success');
        setIsBulkRoomModalOpen(false);
      } catch (error) {
        if (newRooms.length > 0) {
          setRooms(prev => [...prev, ...newRooms]);
        }
        showToast(`Lỗi sau khi tạo được ${successCount} phòng: ` + getApiErrorMessage(error, 'Thao tác thất bại.'), 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  });

  const submitAssignment = assignForm.handleSubmit(async (values) => {
    if (!assignFilterRoomId) {
      showToast('Vui lòng chọn phòng trước khi gán sinh viên.', 'error');
      return;
    }

    const match = values.studentInput.match(/^([A-Za-z0-9]+)\s*-/);
    const userCode = match ? match[1] : values.studentInput.trim();
    const student = students.find(s => s.userCode === userCode);

    if (!student) {
      showToast('Không tìm thấy Sinh viên từ dữ liệu bạn nhập. Vui lòng chọn từ gợi ý.', 'error');
      return;
    }

    const room = rooms.find(r => r.id === assignFilterRoomId);
    if (!room) return;

    const currentAssigns = (roomAssignments[assignFilterRoomId] ?? []).filter(a => a.isActive);
    if (room.capacity && currentAssigns.length >= room.capacity) {
      showToast(`Phòng ${room.roomCode} đã đầy (${currentAssigns.length}/${room.capacity}). Không thể gán thêm người.`, 'error');
      return;
    }

    if (currentAssigns.some(a => a.studentId === student.id)) {
      showToast(`Sinh viên ${student.fullName} hiện đã có trong phòng này.`, 'error');
      return;
    }

    await submitWithFeedback(async () => {
      const res = await apiClient.post<RoomStudentAssignment>(`/locations/rooms/${assignFilterRoomId}/students`, {
        studentId: student.id,
        startDate: values.startDate
      });
      setRoomAssignments(prev => {
        const existing = prev[assignFilterRoomId] ?? [];
        return {
          ...prev,
          [assignFilterRoomId]: [...existing, res.data]
        };
      });
      assignForm.reset({ ...values, studentInput: '' });
    }, 'Gán sinh viên vào phòng thành công.');
  });

  const handleDelete = async (type: 'buildings' | 'floors' | 'rooms', id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa không?')) return;
    await submitWithFeedback(async () => {
      await apiClient.delete(`/locations/${type}/${id}`);
      if (type === 'buildings') {
        setBuildings(prev => prev.filter(b => b.id !== id));
        if (expandedBuildingId === id) setExpandedBuildingId(null);
      }
      if (type === 'floors') {
        setFloors(prev => prev.filter(f => f.id !== id));
        if (selectedFloorId === id) setSelectedFloorId(null);
      }
      if (type === 'rooms') {
        setRooms(prev => prev.filter(r => r.id !== id));
      }
    }, 'Xóa dữ liệu thành công.');
  };

  const handleUnassign = async (roomId: number, studentId: number, studentName: string) => {
    if (!window.confirm(`Xác nhận trả phòng cho sinh viên ${studentName}?`)) return;
    setUnassigningId(studentId);
    await submitWithFeedback(async () => {
      await apiClient.patch(`/locations/rooms/${roomId}/students/${studentId}/unassign`);
      setRoomAssignments(prev => {
        const existing = prev[roomId] ?? [];
        return {
          ...prev,
          [roomId]: existing.map(a => a.studentId === studentId ? { ...a, isActive: false } : a)
        };
      });
    }, 'Trả phòng cho sinh viên thành công.');
    setUnassigningId(null);
  };

  const handleBulkDeleteRooms = async () => {
    if (selectedRoomIds.length === 0) return;
    if (!confirm(`Xác nhận xóa ${selectedRoomIds.length} phòng đã chọn?`)) return;
    await submitWithFeedback(async () => {
      await Promise.all(selectedRoomIds.map(id => apiClient.delete(`/locations/rooms/${id}`)));
      setRooms(prev => prev.filter(r => !selectedRoomIds.includes(r.id)));
      setSelectedRoomIds([]);
    }, `Đã xóa thành công ${selectedRoomIds.length} phòng.`);
  };

  return (
    <div className="space-y-4 max-w-full mx-auto h-full flex flex-col">
      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-200 pb-1 flex-shrink-0">
        <TabButton active={activeTab === 'structure'} onClick={() => setActiveTab('structure')}>
          Cấu trúc Khu phòng (Split-Pane)
        </TabButton>
        <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')}>
          Gán & Trả phòng
        </TabButton>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
          Đang tải dữ liệu khu phòng...
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* STRUCTURE TAB (SPLIT-PANE) */}
          {activeTab === 'structure' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full flex-1 overflow-hidden">

              {/* LEFT COLUMN: NAVIGATOR (Tree View) */}
              <div className="md:col-span-4 lg:col-span-3 border border-slate-200 rounded-2xl bg-white flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
                  <h2 className="font-bold text-slate-800">Khu</h2>
                  <button
                    onClick={() => handleOpenBuildingModal()}
                    className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition"
                    title="Thêm Khu mới"
                  >
                    +
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {buildings.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Chưa có dữ liệu Khu</p>
                  ) : (
                    buildings.map(b => (
                      <div key={b.id} className="space-y-1">
                        {/* Building Row */}
                        <div
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${expandedBuildingId === b.id ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          onClick={() => setExpandedBuildingId(expandedBuildingId === b.id ? null : b.id)}
                        >
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <span className="w-4 h-4 flex items-center justify-center">
                              {expandedBuildingId === b.id ? '▼' : '▶'}
                            </span>
                            {b.code}
                          </div>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenBuildingModal(b); }}
                              className={`text-xs px-2 rounded hover:bg-emerald-500 hover:text-white transition ${expandedBuildingId === b.id ? 'text-slate-300' : 'text-slate-400'}`}
                            >
                              Sửa
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleDelete('buildings', b.id); }}
                              className={`text-xs px-2 rounded hover:bg-rose-500 hover:text-white transition ${expandedBuildingId === b.id ? 'text-slate-300' : 'text-slate-400'}`}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {/* Floors List (Nested) */}
                        {expandedBuildingId === b.id && (
                          <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 mt-1 pb-2">
                            {floors.filter(f => f.buildingId === b.id).map(f => (
                              <div
                                key={f.id}
                                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedFloorId === f.id ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                  }`}
                                onClick={() => setSelectedFloorId(f.id)}
                              >
                                <span>Tầng {f.floorNumber} {f.name ? `(${f.name})` : ''}</span>
                                <div className="hidden group-hover:flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenFloorModal(b.id, f); }}
                                    className="text-xs px-1 text-emerald-500 hover:text-emerald-700"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); void handleDelete('floors', f.id); }}
                                    className="text-xs px-1 text-rose-400 hover:text-rose-600"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={() => handleOpenFloorModal(b.id)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium py-1 px-2 w-full text-left mt-1"
                            >
                              + Thêm Tầng
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: WORKSPACE (Rooms) */}
              <div className="md:col-span-8 lg:col-span-9 h-full flex flex-col min-h-0">
                {!selectedFloorId ? (
                  <div className="flex-1 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-slate-50/50">
                    <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <h3 className="text-lg font-medium text-slate-700">Chưa chọn Tầng</h3>
                    <p className="text-sm mt-1">Vui lòng chọn một Tầng ở khu bên trái để quản lý phòng.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                      <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-lg">
                        {floors.find(f => f.id === selectedFloorId)?.floorNumber}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          Quản lý Phòng - Tầng {floors.find(f => f.id === selectedFloorId)?.floorNumber}
                        </h2>
                        <p className="text-sm text-slate-500">Khu {buildings.find(b => b.id === floors.find(f => f.id === selectedFloorId)?.buildingId)?.name}</p>
                      </div>
                    </div>

                    <SectionCard
                      title={`Danh sách Phòng (${roomsOfSelectedFloor.length})`}
                      actions={
                        <div className="flex gap-2 items-center">
                          {roomsOfSelectedFloor.length > 0 && (
                            <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                              <label className="text-sm flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  checked={selectedRoomIds.length === roomsOfSelectedFloor.length && roomsOfSelectedFloor.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedRoomIds(roomsOfSelectedFloor.map(r => r.id));
                                    else setSelectedRoomIds([]);
                                  }}
                                />
                                Chọn tất cả
                              </label>
                              {selectedRoomIds.length > 0 && (
                                <button onClick={handleBulkDeleteRooms} className="text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded">
                                  Xóa ({selectedRoomIds.length})
                                </button>
                              )}
                            </div>
                          )}
                          <button onClick={() => handleOpenRoomModal(selectedFloorId)} className="px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition">+ Tạo 1 phòng</button>
                          <button onClick={() => handleOpenBulkRoomModal(selectedFloorId)} className="px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition">+ Tạo hàng loạt</button>
                        </div>
                      }
                    >
                      {roomsOfSelectedFloor.length === 0 ? (
                        <EmptyState title="Chưa có phòng" description="Tầng này hiện chưa có phòng nào." />
                      ) : (
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {roomsOfSelectedFloor.map((room) => (
                            <article
                              key={room.id}
                              onClick={() => {
                                if (selectedRoomIds.includes(room.id)) setSelectedRoomIds(selectedRoomIds.filter(id => id !== room.id));
                                else setSelectedRoomIds([...selectedRoomIds, room.id]);
                              }}
                              className={`group rounded-xl border ${selectedRoomIds.includes(room.id) ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white'} p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition cursor-pointer`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedRoomIds.includes(room.id)}
                                    readOnly
                                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                  <h3 className="text-lg font-bold text-slate-800">{room.roomCode}</h3>
                                </div>
                                <div className="hidden group-hover:flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenRoomModal(selectedFloorId, room); }}
                                    className="text-slate-300 hover:text-emerald-600 transition"
                                    title="Sửa phòng"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void handleDelete('rooms', room.id); }}
                                    className="text-slate-300 hover:text-rose-500 transition"
                                    title="Xóa phòng"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                  <span>{room.capacity ?? '--'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 truncate" title={room.note || ''}>
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  <span className="truncate">{room.note || 'Trống'}</span>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STUDENTS ASSIGNMENT TAB */}
          {activeTab === 'students' && (
            <div className="space-y-6 overflow-y-auto pr-2 pb-10">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  Bộ lọc Tìm kiếm Phòng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={assignFilterBuildingId}
                    onChange={e => { setAssignFilterBuildingId(e.target.value ? Number(e.target.value) : ''); setAssignFilterFloorId(''); setAssignFilterRoomId(''); }}
                    className={inputClassName}
                  >
                    <option value="">-- Tất cả Khu --</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                  </select>

                  <select
                    value={assignFilterFloorId}
                    onChange={e => { setAssignFilterFloorId(e.target.value ? Number(e.target.value) : ''); setAssignFilterRoomId(''); }}
                    className={inputClassName}
                    disabled={!assignFilterBuildingId}
                  >
                    <option value="">-- Tất cả Tầng --</option>
                    {assignFloors.map(f => <option key={f.id} value={f.id}>Tầng {f.floorNumber}</option>)}
                  </select>

                  <select
                    value={assignFilterRoomId}
                    onChange={e => setAssignFilterRoomId(e.target.value ? Number(e.target.value) : '')}
                    className={inputClassName}
                    disabled={!assignFilterFloorId}
                  >
                    <option value="">-- Chọn Phòng cụ thể --</option>
                    {assignRooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
                  </select>
                </div>
              </div>

              {assignFilterRoomId ? (
                <SectionCard title={`Gán sinh viên vào phòng ${rooms.find(r => r.id === assignFilterRoomId)?.roomCode}`}>
                  <form className="grid gap-3 md:grid-cols-3" onSubmit={submitAssignment}>
                    <InputField label="Chọn Sinh viên" error={assignForm.formState.errors.studentInput?.message}>
                      <input
                        list="student-options"
                        {...assignForm.register('studentInput')}
                        className={inputClassName}
                        placeholder="Gõ mã SV hoặc Tên..."
                        autoComplete="off"
                      />
                      <datalist id="student-options">
                        {students.map((student) => (
                          <option key={student.id} value={`${student.userCode} - ${student.fullName}`} />
                        ))}
                      </datalist>
                    </InputField>
                    <InputField label="Ngày bắt đầu ở" error={assignForm.formState.errors.startDate?.message}>
                      <input type="date" {...assignForm.register('startDate')} className={inputClassName} />
                    </InputField>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={
                          (() => {
                            const room = rooms.find(r => r.id === assignFilterRoomId);
                            if (!room) return false;
                            const currentAssigns = (roomAssignments[assignFilterRoomId] ?? []).filter(a => a.isActive);
                            return !!room.capacity && currentAssigns.length >= room.capacity;
                          })()
                        }
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                      >
                        {(() => {
                          const room = rooms.find(r => r.id === assignFilterRoomId);
                          if (!room) return 'Xác nhận Gán';
                          const currentAssigns = (roomAssignments[assignFilterRoomId] ?? []).filter(a => a.isActive);
                          if (!!room.capacity && currentAssigns.length >= room.capacity) return 'Phòng đã đầy';
                          return 'Xác nhận Gán';
                        })()}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ) : assignRooms.length === 0 && assignFilterFloorId ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-200 shadow-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Tầng này hiện <strong>chưa có phòng nào</strong>. Vui lòng quay lại tab <strong>Cấu trúc Khu phòng</strong> để tạo phòng trước khi gán sinh viên!</span>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm border border-amber-200 shadow-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Bạn đã chọn Khu và Tầng. Bây giờ hãy bấm vào ô <strong>"-- Chọn Phòng cụ thể --"</strong> ở trên để bắt đầu gán sinh viên nhé!</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between mt-8 mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Danh sách người đang ở</h3>
                  <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                    Có <span className="font-bold">{assignRooms.filter(r => ((roomAssignments[r.id] ?? []).filter(a => a.isActive)).length === 0).length}</span> phòng trống / <span className="font-bold text-emerald-700">{assignRooms.filter(r => ((roomAssignments[r.id] ?? []).filter(a => a.isActive)).length > 0).length}</span> phòng đang có người
                  </div>
                </div>
                {assignRooms.filter(r => ((roomAssignments[r.id] ?? []).filter(a => a.isActive)).length > 0).length === 0 ? (
                  <p className="text-sm text-slate-500">Không có phòng nào đang có người ở trong khu vực này.</p>
                ) : (
                  assignRooms.map((room) => {
                    const roomAssigns = (roomAssignments[room.id] ?? []).filter(a => a.isActive);
                    if (roomAssigns.length === 0) return null;

                    return (
                      <article
                        key={room.id}
                        className={`rounded-2xl border ${expandedAssignRoomId === room.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'} bg-white p-4 shadow-sm cursor-pointer transition-all`}
                        onClick={() => setExpandedAssignRoomId(expandedAssignRoomId === room.id ? null : room.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${expandedAssignRoomId === room.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              <svg className={`w-5 h-5 transition-transform ${expandedAssignRoomId === room.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900">Phòng {room.roomCode}</h4>
                              <p className="text-sm text-slate-500">
                                Đang ở: <span className="font-semibold text-slate-700">{roomAssigns.length}</span> / {room.capacity ?? '--'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            Khu {room.floor?.building?.code} - Tầng {room.floor?.floorNumber}
                          </span>
                        </div>

                        {expandedAssignRoomId === room.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="text-left text-slate-600 bg-slate-50">
                                <tr>
                                  <th className="py-3 px-4 font-medium rounded-tl-lg">Sinh viên</th>
                                  <th className="py-3 px-4 font-medium">Mã SV</th>
                                  <th className="py-3 px-4 font-medium">Ngày vào</th>
                                  <th className="py-3 px-4 font-medium text-right rounded-tr-lg">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {roomAssigns.map((assignment) => (
                                  <tr key={assignment.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-3 px-4 font-medium text-slate-900">{assignment.student.fullName}</td>
                                    <td className="py-3 px-4 text-slate-600">{assignment.student.userCode}</td>
                                    <td className="py-3 px-4 text-slate-600">{formatDate(assignment.startDate)}</td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        type="button"
                                        disabled={unassigningId === assignment.student.id}
                                        onClick={(e) => { e.stopPropagation(); void handleUnassign(room.id, assignment.student.id, assignment.student.fullName); }}
                                        className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
                                      >
                                        {unassigningId === assignment.student.id ? 'Đang trả...' : 'Trả phòng'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      <Modal isOpen={isBuildingModalOpen} onClose={() => setIsBuildingModalOpen(false)} title={selectedBuilding ? 'Sửa Khu' : 'Tạo Khu Mới'} maxWidth="max-w-md">
        <form className="grid gap-4" onSubmit={submitBuilding}>
          <InputField label="Mã Khu" error={buildingForm.formState.errors.code?.message}>
            <input {...buildingForm.register('code')} className={inputClassName} placeholder="VD: B1" />
          </InputField>
          <InputField label="Tên Khu" error={buildingForm.formState.errors.name?.message}>
            <input {...buildingForm.register('name')} className={inputClassName} placeholder="VD: Ký túc xá B1" />
          </InputField>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsBuildingModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition">Hủy</button>
            <button type="submit" className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition">Lưu</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isFloorModalOpen} onClose={() => setIsFloorModalOpen(false)} title={selectedFloor ? 'Sửa Tầng' : 'Tạo Tầng Mới'} maxWidth="max-w-md">
        <form className="grid gap-4" onSubmit={submitFloor}>
          <InputField label="Số Tầng" error={floorForm.formState.errors.floorNumber?.message}>
            <input type="number" {...floorForm.register('floorNumber')} className={inputClassName} placeholder="VD: 1, 2" />
          </InputField>
          <InputField label="Tên Tầng (Tuỳ chọn)" error={floorForm.formState.errors.name?.message}>
            <input {...floorForm.register('name')} className={inputClassName} placeholder="VD: Tầng 1" />
          </InputField>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsFloorModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition">Hủy</button>
            <button type="submit" className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition">Lưu</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title={selectedRoom ? 'Sửa Phòng' : 'Tạo Phòng Mới'} maxWidth="max-w-md">
        <form className="grid gap-4" onSubmit={submitRoom}>
          <InputField label="Mã Phòng" error={roomForm.formState.errors.roomCode?.message}>
            <input {...roomForm.register('roomCode')} className={inputClassName} placeholder="VD: B1-101" />
          </InputField>
          <InputField label="Sức chứa (người)" error={roomForm.formState.errors.capacity?.message}>
            <input type="number" {...roomForm.register('capacity')} className={inputClassName} placeholder="VD: 8" />
          </InputField>
          <InputField label="Ghi chú" error={roomForm.formState.errors.note?.message}>
            <textarea {...roomForm.register('note')} className={`${inputClassName} resize-none h-24`} placeholder="Mô tả..." />
          </InputField>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition">Hủy</button>
            <button type="submit" className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition">Lưu</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBulkRoomModalOpen} onClose={() => setIsBulkRoomModalOpen(false)} title="Tạo Phòng Hàng Loạt" maxWidth="max-w-xl">
        <form className="grid gap-4" onSubmit={submitBulkRoom}>
          <InputField label="Tiền tố phòng" error={bulkRoomForm.formState.errors.prefix?.message}>
            <input {...bulkRoomForm.register('prefix')} className={inputClassName} placeholder="VD: B1-1" />
          </InputField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Từ số" error={bulkRoomForm.formState.errors.startNumber?.message}>
              <input type="number" {...bulkRoomForm.register('startNumber')} className={inputClassName} />
            </InputField>
            <InputField label="Đến số" error={bulkRoomForm.formState.errors.endNumber?.message}>
              <input type="number" {...bulkRoomForm.register('endNumber')} className={inputClassName} />
            </InputField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Sức chứa chung" error={bulkRoomForm.formState.errors.capacity?.message}>
              <input type="number" {...bulkRoomForm.register('capacity')} className={inputClassName} />
            </InputField>
            <InputField label="Ghi chú chung" error={bulkRoomForm.formState.errors.note?.message}>
              <input {...bulkRoomForm.register('note')} className={inputClassName} />
            </InputField>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsBulkRoomModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition">Hủy</button>
            <button type="submit" disabled={isGenerating} className="px-4 py-2 font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50">
              {isGenerating ? 'Đang tạo...' : 'Tạo hàng loạt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );

  async function submitWithFeedback(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      showToast(successMessage, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Thao tác thất bại.'), 'error');
    }
  }
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 font-semibold text-sm transition-all ${active
          ? 'border-b-2 border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
        }`}
    >
      {children}
    </button>
  );
}

function InputField({ label, error, children, className = '' }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 w-full ${className}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
    </label>
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10';
