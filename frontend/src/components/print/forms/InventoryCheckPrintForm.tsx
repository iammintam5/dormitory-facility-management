import { ReactNode } from 'react';
import { formatDateOnly, formatDateTime } from '../../../lib/date';
import { InventoryCheckExportResponse } from '../../../types/inventory-checks';
import {
  PrintLayout,
  PrintSection,
  PrintSignatures,
  PrintTable,
} from '../PrintLayout';

export function InventoryCheckPrintForm({
  inventoryCheck,
  onPrint,
  backAction,
}: {
  inventoryCheck: InventoryCheckExportResponse;
  onPrint: () => void;
  backAction?: ReactNode;
}) {
  return (
    <PrintLayout title="PHIẾU KIỂM KÊ TÀI SẢN PHÒNG" onPrint={onPrint} backAction={backAction}>
      <div className="mb-6 text-center italic">
        <p>Mã phiếu: {inventoryCheck.inventoryCode}</p>
        <p>Hôm nay, ngày {formatDateOnly(inventoryCheck.checkDate)}, chúng tôi tiến hành kiểm kê tài sản:</p>
      </div>

      <PrintSection title="I. THÔNG TIN CHUNG">
        <p><span className="font-semibold">Phòng kiểm kê:</span> {inventoryCheck.room?.roomCode ?? 'Toàn bộ'}</p>
        <p><span className="font-semibold">Người kiểm kê:</span> {inventoryCheck.checkedByUser.fullName} - {inventoryCheck.checkedByUser.userCode}</p>
        <p><span className="font-semibold">Trạng thái:</span> {inventoryCheck.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang nhập kết quả'}</p>
      </PrintSection>

      <PrintSection title="II. KẾT QUẢ KIỂM KÊ">
        <PrintTable headers={['STT', 'Tên tài sản', 'Mã tài sản', 'SL Sổ sách', 'SL Thực tế', 'Chênh lệch', 'Tình trạng', 'Ghi chú']}>
          {inventoryCheck.inventoryCheckItems.map((item, index) => (
            <tr key={item.id}>
              <td className="border border-slate-900 p-2 text-center">{index + 1}</td>
              <td className="border border-slate-900 p-2 font-medium">{item.asset.assetName}</td>
              <td className="border border-slate-900 p-2 text-center">{item.asset.assetCode}</td>
              <td className="border border-slate-900 p-2 text-center">{item.systemQuantity}</td>
              <td className="border border-slate-900 p-2 text-center font-semibold">{item.actualQuantity}</td>
              <td className="border border-slate-900 p-2 text-center">
                {item.difference > 0 ? `+${item.difference}` : item.difference}
              </td>
              <td className="border border-slate-900 p-2">{item.actualCondition || '--'}</td>
              <td className="border border-slate-900 p-2">{item.note || '--'}</td>
            </tr>
          ))}
        </PrintTable>
      </PrintSection>

      <PrintSection title="III. KẾT LUẬN & ĐỀ XUẤT">
        <div className="text-justify indent-8 min-h-[100px]">
          {inventoryCheck.generalNote ? (
            <p>{inventoryCheck.generalNote}</p>
          ) : (
            <p>Tài sản thực tế khớp với sổ sách, không có hư hỏng phát sinh cần báo cáo.</p>
          )}
        </div>
      </PrintSection>

      {(!inventoryCheck.councilMembers || inventoryCheck.councilMembers.length === 0) ? (
        <PrintSignatures
          leftTitle="NGƯỜI KIỂM KÊ"
          leftSubtitle={inventoryCheck.checkedByUser.fullName}
          rightTitle="ĐẠI DIỆN BAN QUẢN LÝ"
          rightSubtitle=""
        />
      ) : (
        <div className="no-break mt-9 flex flex-wrap justify-between px-6 text-[13pt] gap-y-10 gap-x-4">
          {inventoryCheck.councilMembers.map((member) => (
            <div key={member.user.id} className="w-[30%] text-center">
              <p className="font-bold uppercase">{member.roleInCouncil}</p>
              <p className="mb-16 text-[12pt] italic">(Ký và ghi rõ họ tên)</p>
              <p className="font-semibold">{member.user.fullName}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-right text-[11pt] italic text-slate-500">
        Thời gian in: {formatDateTime(inventoryCheck.printable.generatedAt)}
      </p>
    </PrintLayout>
  );
}
