import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../toast/toast-context';
import { EmptyState } from '../../components/admin/EmptyState';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { SectionCard } from '../../components/admin/SectionCard';
import { PrintHandoverRecord } from '../../components/admin/PrintHandoverRecord';
import { apiClient } from '../../lib/axios';
import { formatDateTime } from '../../lib/format';
import { Handover, HandoverExportResponse, HandoversResponse } from '../../types/handovers';
import { Room } from '../../types/locations';
import { User } from '../../types/users';
import { Asset } from '../../types/assets';
import { useDebounce } from '../../hooks/use-debounce';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  WAITING_CONFIRMATION: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RETURNED: 'bg-purple-100 text-purple-800 border-purple-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-800 border-slate-300',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  WAITING_CONFIRMATION: 'Chờ xác nhận',
  PENDING: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  APPROVED: 'Đã duyệt',
  COMPLETED: 'Hoàn thành',
  RETURNED: 'Đã trả phòng',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (['CONFIRMED', 'APPROVED', 'COMPLETED'].includes(status)) return <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
  if (['WAITING_CONFIRMATION', 'PENDING', 'PENDING_APPROVAL'].includes(status)) return <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  if (['CANCELLED', 'REJECTED'].includes(status)) return <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
  if (status === 'RETURNED') return <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;
  return <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
};

const createHandoverSchema = z.object({
  roomId: z.coerce.number().int().positive('Vui lòng chọn phòng'),
  studentId: z.coerce.number().int().positive('Vui lòng chọn sinh viên'),
  handoverDate: z.string().min(1, 'Vui lòng chọn ngày bàn giao'),
  note: z.string().optional(),
  items: z.array(
    z.object({
      assetId: z.number(),
      quantity: z.number().min(1),
      conditionAtHandover: z.string().min(1, 'Nhập tình trạng'),
    })
  ).min(1, 'Phải chọn ít nhất 1 tài sản'),
});

type CreateHandoverForm = z.infer<typeof createHandoverSchema>;

export function HandoversManagementPage() {
  const { showToast } = useToast();
  
  // Data States
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [exportData, setExportData] = useState<HandoverExportResponse | null>(null);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);
  
  // Form handling
  const [editingHandoverId, setEditingHandoverId] = useState<number | null>(null);
  const prevRoomId = useRef<number>(0);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Return handling
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningHandover, setReturningHandover] = useState<Handover | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<{assetId: number, assetCode: string, assetName: string, conditionAtReturn: string, returnStatus: Asset['status']}[]>([]);
  const [returnNote, setReturnNote] = useState('');
  
  const form = useForm<CreateHandoverForm>({
    resolver: zodResolver(createHandoverSchema),
    defaultValues: {
      roomId: 0,
      studentId: 0,
      handoverDate: new Date().toISOString().split('T')[0],
      note: '',
      items: [],
    },
  });

  useEffect(() => {
    void loadHandovers();
  }, [page, statusFilter, debouncedKeyword]);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const selectedRoomId = form.watch('roomId');

  useEffect(() => {
    if (selectedRoomId && selectedRoomId > 0) {
      void loadRoomData(selectedRoomId);
      if (prevRoomId.current !== 0 && prevRoomId.current !== selectedRoomId) {
        form.setValue('items', []);
      }
      prevRoomId.current = selectedRoomId;
    } else {
      setStudents([]);
      setAvailableAssets([]);
      form.setValue('items', []);
      prevRoomId.current = 0;
    }
  }, [selectedRoomId]);

  const loadInitialData = async () => {
    try {
      const { data } = await apiClient.get<Room[]>('/locations/rooms');
      setRooms(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRoomData = async (roomId: number) => {
    try {
      const [studentsRes, assetsRes] = await Promise.all([
        apiClient.get<User[]>(`/handovers/room-students/${roomId}`),
        apiClient.get<Asset[]>(`/handovers/room-assets/${roomId}`),
      ]);
      setStudents(studentsRes.data);
      setAvailableAssets(assetsRes.data);
      if (studentsRes.data.length > 0 && form.getValues('studentId') === 0) {
        form.setValue('studentId', studentsRes.data[0].id);
      } else if (studentsRes.data.length === 0) {
        form.setValue('studentId', 0);
      }
    } catch (error) {
      console.error(error);
      setStudents([]);
      setAvailableAssets([]);
    }
  };

  const loadHandovers = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<HandoversResponse>('/handovers', {
        params: {
          page,
          pageSize: 10,
          status: statusFilter || undefined,
          keyword: debouncedKeyword || undefined,
        },
      });
      setHandovers(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast(error.response?.data?.message || 'Không thể tải danh sách bàn giao', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHandoverId(null);
    form.reset({
      roomId: 0,
      studentId: 0,
      handoverDate: new Date().toISOString().split('T')[0],
      note: '',
      items: [],
    });
    prevRoomId.current = 0;
  };

  const openEditModal = (handover: Handover) => {
    setEditingHandoverId(handover.id);
    prevRoomId.current = 0; // Reset để không bị xóa items
    form.reset({
      roomId: handover.roomId,
      studentId: handover.studentId,
      handoverDate: new Date(handover.handoverDate).toISOString().split('T')[0],
      note: handover.note || '',
      items: handover.handoverItems?.map(i => ({
        assetId: i.assetId,
        quantity: i.quantity,
        conditionAtHandover: i.conditionAtHandover,
      })) || [],
    });
    setIsModalOpen(true);
  };

  const openReturnModal = (handover: Handover) => {
    setReturningHandover(handover);
    setReturnItemsState(
      handover.handoverItems?.map(item => ({
        assetId: item.assetId,
        assetCode: item.asset?.assetCode || '',
        assetName: item.asset?.assetName || '',
        conditionAtReturn: item.conditionAtHandover,
        returnStatus: 'AVAILABLE'
      })) || []
    );
    setReturnNote('');
    setIsReturnModalOpen(true);
  };

  const closeReturnModal = () => {
    setIsReturnModalOpen(false);
    setReturningHandover(null);
    setReturnItemsState([]);
    setReturnNote('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningHandover) return;
    try {
      await apiClient.post(`/handovers/${returningHandover.id}/mark-returned`, {
        note: returnNote,
        items: returnItemsState.map(i => ({
          assetId: i.assetId,
          conditionAtReturn: i.conditionAtReturn,
          returnStatus: i.returnStatus
        }))
      });
      showToast('Thu hồi tài sản thành công', 'success');
      closeReturnModal();
      void loadHandovers();
    } catch (error) {
      showToast('Lỗi khi thu hồi tài sản', 'error');
    }
  };

  const onSubmit = async (values: CreateHandoverForm) => {
    try {
      if (editingHandoverId) {
        await apiClient.patch(`/handovers/${editingHandoverId}`, values);
        showToast('Cập nhật biên bản thành công', 'success');
      } else {
        await apiClient.post('/handovers', values);
        showToast('Tạo biên bản bàn giao thành công', 'success');
      }
      closeModal();
      void loadHandovers();
      void loadInitialData();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast(error.response?.data?.message || 'Lỗi khi xử lý', 'error');
      }
    }
  };

  const handlePrint = async (handoverId: number) => {
    try {
      const { data } = await apiClient.get<HandoverExportResponse>(`/handovers/${handoverId}/export`);
      setExportData(data);
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      showToast('Lỗi khi tải dữ liệu in', 'error');
    }
  };

  const cancelHandover = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy biên bản này?')) return;
    try {
      await apiClient.post(`/handovers/${id}/cancel`, { note: 'Quản lý hủy' });
      showToast('Đã hủy biên bản', 'success');
      void loadHandovers();
    } catch (error) {
      showToast('Lỗi khi hủy biên bản', 'error');
    }
  };
  
  const sendConfirmation = async (id: number) => {
    try {
      await apiClient.post(`/handovers/${id}/send-confirmation`, { note: 'Yêu cầu xác nhận' });
      showToast('Đã gửi yêu cầu xác nhận', 'success');
      void loadHandovers();
    } catch (error) {
      showToast('Lỗi khi gửi yêu cầu', 'error');
    }
  };

  // UI Handlers for Asset Selection in Form
  const selectedItems = form.watch('items');
  const isAllSelected = availableAssets.length > 0 && selectedItems.length === availableAssets.length;
  
  const toggleSelectAll = () => {
    if (isAllSelected) {
      form.setValue('items', []);
    } else {
      form.setValue('items', availableAssets.map(asset => ({
        assetId: asset.id,
        quantity: 1,
        conditionAtHandover: asset.status === 'IN_USE' ? 'Đang sử dụng' : 'Tốt'
      })));
    }
  };

  const toggleAsset = (asset: Asset) => {
    const isSelected = selectedItems.some(i => i.assetId === asset.id);
    if (isSelected) {
      form.setValue('items', selectedItems.filter(i => i.assetId !== asset.id));
    } else {
      form.setValue('items', [
        ...selectedItems,
        { 
          assetId: asset.id, 
          quantity: 1, 
          conditionAtHandover: asset.status === 'IN_USE' ? 'Đang sử dụng' : 'Tốt' 
        }
      ]);
    }
  };

  const inputClassName = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Bàn giao Tài sản</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý việc cấp phát và thu hồi tài sản sinh viên.</p>
        </div>
        <button
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          + Tạo Biên bản mới
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Tìm theo mã, tên..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <SectionCard title="Danh sách Biên bản">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
        ) : handovers.length === 0 ? (
          <EmptyState title="Không tìm thấy biên bản" description="Chưa có biên bản bàn giao nào được tạo." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã BB</th>
                  <th className="px-4 py-3 font-medium">Ngày lập</th>
                  <th className="px-4 py-3 font-medium">Phòng</th>
                  <th className="px-4 py-3 font-medium">Sinh viên nhận</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {handovers.map((handover) => (
                  <tr key={handover.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{handover.handoverCode}</td>
                    <td className="px-4 py-3">{formatDateTime(handover.createdAt)}</td>
                    <td className="px-4 py-3">{handover.room?.roomCode}</td>
                    <td className="px-4 py-3">{handover.student?.fullName} ({handover.student?.userCode})</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColors[handover.status] || 'bg-slate-100'}`}>
                        <StatusIcon status={handover.status} />
                        {statusLabels[handover.status] || handover.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedHandover(handover); setIsDetailModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Chi tiết"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button 
                          onClick={() => void handlePrint(handover.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="In PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        {handover.status === 'CONFIRMED' && (
                          <button 
                            onClick={() => openReturnModal(handover)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Thu hồi"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          </button>
                        )}
                        {handover.status === 'DRAFT' && (
                          <>
                            <button 
                              onClick={() => openEditModal(handover)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Sửa"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => void sendConfirmation(handover.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Gửi xác nhận"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                            <button 
                              onClick={() => void cancelHandover(handover.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hủy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="mt-4">
            <PaginationBar page={page} totalPages={totalPages} total={totalRecords} onPageChange={setPage} />
          </div>
        )}
      </SectionCard>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết Biên bản: {selectedHandover.handoverCode}</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Phòng</span> 
                  <p className="font-bold text-slate-800 text-base">{selectedHandover.room?.roomCode}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Sinh viên nhận</span> 
                  <p className="font-bold text-slate-800 text-base">{selectedHandover.student?.fullName}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-2">Trạng thái</span> 
                  <StatusIcon status={selectedHandover.status} />
                </div>
                <div>
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Người tạo</span> 
                  <p className="font-bold text-slate-800 text-base">{selectedHandover.createdByUser?.fullName || 'Đang tải...'}</p>
                </div>
              </div>
              
              <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Danh sách tài sản ({selectedHandover.handoverItems?.length})
              </h4>
              <ul className="space-y-3">
                {(() => {
                  if (!selectedHandover.handoverItems) return null;
                  const groups = new Map<string, { assetName: string, quantity: number, condition: string, codes: string[] }>();
                  selectedHandover.handoverItems.forEach(item => {
                    const key = `${item.asset?.assetName}|${item.conditionAtHandover}`;
                    if (groups.has(key)) {
                      const existing = groups.get(key)!;
                      existing.quantity += item.quantity;
                      if (item.asset?.assetCode) existing.codes.push(item.asset.assetCode);
                    } else {
                      groups.set(key, {
                        assetName: item.asset?.assetName || '',
                        quantity: item.quantity,
                        condition: item.conditionAtHandover,
                        codes: item.asset?.assetCode ? [item.asset.assetCode] : []
                      });
                    }
                  });
                  return Array.from(groups.values()).map((group, index) => (
                    <li key={index} className="p-4 flex justify-between items-center bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
                      <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <p className="font-bold text-slate-800 text-base">{group.assetName}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 max-w-full break-all">
                            {group.codes.join(', ')}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 border-l border-slate-300 pl-3">
                             Tình trạng: <span className="font-semibold text-emerald-700">{group.condition}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">SL: {group.quantity}</span>
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">{editingHandoverId ? 'Cập nhật Biên bản' : 'Tạo Biên bản Bàn giao mới'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="create-handover-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Chọn Phòng</label>
                    <select {...form.register('roomId', { valueAsNumber: true })} className={inputClassName}>
                      <option value={0}>-- Chọn phòng --</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.roomCode}</option>)}
                    </select>
                    {form.formState.errors.roomId && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.roomId.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Chọn Sinh viên nhận</label>
                    <select {...form.register('studentId', { valueAsNumber: true })} className={inputClassName} disabled={students.length === 0}>
                      <option value={0}>{students.length === 0 ? "Không có sinh viên" : "-- Chọn sinh viên --"}</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.userCode})</option>)}
                    </select>
                    {form.formState.errors.studentId && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.studentId.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ngày bàn giao</label>
                  <input type="date" {...form.register('handoverDate')} className={inputClassName} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <input type="text" {...form.register('note')} className={inputClassName} placeholder="Ví dụ: Bàn giao khi vào đầu năm học..." />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-bold mb-2">Tài sản bàn giao</h4>
                  {form.formState.errors.items && <p className="text-rose-500 text-xs mb-2">{form.formState.errors.items.message}</p>}
                  
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 shadow-inner flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white rounded-t-xl">
                      <p className="text-sm font-semibold text-slate-800">Tài sản trong phòng ({selectedItems.length}/{availableAssets.length} đã chọn)</p>
                      {availableAssets.length > 0 && (
                        <button type="button" onClick={toggleSelectAll} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                          {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      )}
                    </div>

                    <div className="p-4 h-[360px] overflow-y-auto custom-scrollbar">
                      {!selectedRoomId ? (
                        <div className="m-auto flex flex-col items-center justify-center text-slate-400 h-full">
                          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                          <p className="text-sm text-center">Vui lòng chọn phòng trước</p>
                        </div>
                      ) : availableAssets.length === 0 ? (
                        <div className="m-auto flex flex-col items-center justify-center text-slate-400 h-full">
                          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                          <p className="text-sm text-center">Phòng này hiện chưa có<br/>tài sản nào</p>
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {availableAssets.map(asset => {
                            const itemIndex = selectedItems.findIndex(i => i.assetId === asset.id);
                            const isSelected = itemIndex !== -1;
                            
                            return (
                              <li key={asset.id} className={`p-4 border rounded-xl transition-all ${isSelected ? 'bg-white border-emerald-500 shadow-sm' : 'bg-white/60 border-slate-200 hover:border-emerald-300'} cursor-pointer`} onClick={() => toggleAsset(asset)}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                  <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 truncate">{asset.assetName}</p>
                                      <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.assetCode}</p>
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-md ${
                                      asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                      asset.status === 'IN_USE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                      asset.status === 'DAMAGED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                      asset.status === 'UNDER_MAINTENANCE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                      'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      {asset.status === 'AVAILABLE' ? 'Trống' :
                                       asset.status === 'IN_USE' ? 'Đang dùng' :
                                       asset.status === 'DAMAGED' ? 'Báo hỏng' :
                                       asset.status === 'UNDER_MAINTENANCE' ? 'Bảo trì' : 'Khác'}
                                    </span>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-3 pl-9" onClick={e => e.stopPropagation()}>
                                    <input 
                                      {...form.register(`items.${itemIndex}.conditionAtHandover`)} 
                                      className="w-full text-xs border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 bg-slate-50 outline-none transition-colors" 
                                      placeholder="Tình trạng (VD: Tốt, Trầy xước...)" 
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={closeModal} className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button type="submit" form="create-handover-form" className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 shadow-sm">{editingHandoverId ? 'Lưu thay đổi' : 'Tạo Biên bản'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Area */}
      <PrintHandoverRecord ref={printRef} data={exportData} />

      {/* Return Modal */}
      {isReturnModalOpen && returningHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Thu hồi tài sản bàn giao</h3>
              <button onClick={closeReturnModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="return-handover-form" onSubmit={handleReturnSubmit} className="space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Thông tin phòng: {returningHandover.room?.roomCode}</h4>
                  <p className="text-sm text-slate-600 mb-4">Sinh viên trả: <span className="font-medium">{returningHandover.student?.fullName}</span></p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800">Đánh giá lại tình trạng tài sản</h4>
                  {returnItemsState.map((item, index) => (
                    <div key={item.assetId} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{item.assetName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{item.assetCode}</p>
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Tình trạng thực tế</label>
                        <input
                          type="text"
                          value={item.conditionAtReturn}
                          onChange={(e) => {
                            const newItems = [...returnItemsState];
                            newItems[index].conditionAtReturn = e.target.value;
                            setReturnItemsState(newItems);
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="w-1/4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Phân loại</label>
                        <select
                          value={item.returnStatus}
                          onChange={(e) => {
                            const newItems = [...returnItemsState];
                            newItems[index].returnStatus = e.target.value as Asset['status'];
                            setReturnItemsState(newItems);
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="AVAILABLE">Tốt (Có thể dùng tiếp)</option>
                          <option value="DAMAGED">Báo hỏng</option>
                          <option value="PENDING_LIQUIDATION">Chờ thanh lý</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú chung</label>
                  <textarea
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    rows={3}
                    placeholder="VD: Sinh viên làm mất chìa khóa tủ..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </form>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={closeReturnModal} type="button" className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button type="submit" form="return-handover-form" className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 shadow-sm">Xác nhận Thu hồi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
