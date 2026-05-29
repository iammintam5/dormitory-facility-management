import { ReactNode } from 'react';
import { formatDate, formatDateTime } from '../../../lib/format';
import { HandoverExportResponse } from '../../../types/handovers';
import {
  PrintInfoGrid,
  PrintInfoRow,
  PrintLayout,
  PrintSection,
  PrintSignatures,
  PrintTable,
} from '../PrintLayout';

export function HandoverPrintForm({
  handover,
  onPrint,
  backAction,
}: {
  handover: HandoverExportResponse;
  onPrint: () => void;
  backAction?: ReactNode;
}) {
  return (
    <PrintLayout title="BIÊN BẢN BÀN GIAO TÀI SẢN KÝ TÚC XÁ" onPrint={onPrint} backAction={backAction}>
      <div className="mb-6 text-center italic">
        <p>Mã biên bản: {handover.handoverCode}</p>
        <p>Hôm nay, ngày {formatDate(handover.handoverDate)}, chúng tôi gồm có:</p>
      </div>

      <PrintSection title="I. ĐẠI DIỆN BÊN GIAO (Ban quản lý KTX)">
        <p><span className="font-semibold">Ông/Bà:</span> {handover.createdByUser?.fullName ?? '--'}</p>
      </PrintSection>

      <PrintSection title="II. ĐẠI DIỆN BÊN NHẬN (Sinh viên)">
        <p><span className="font-semibold">Họ và tên:</span> {handover.student.fullName}</p>
        <p><span className="font-semibold">Mã sinh viên:</span> {handover.student.userCode}</p>
        <p><span className="font-semibold">Nhận bàn giao phòng:</span> {handover.room.roomCode}</p>
      </PrintSection>

      <PrintSection title="III. CHI TIẾT TÀI SẢN BÀN GIAO">
        <p className="mb-2">Bên giao tiến hành bàn giao cho bên nhận các tài sản sau:</p>
        <PrintTable headers={['STT', 'Tên tài sản', 'Mã tài sản', 'Số lượng', 'Tình trạng', 'Ghi chú']}>
          {handover.handoverItems.map((item, index) => (
            <tr key={item.id}>
              <td className="border border-slate-900 p-2 text-center">{index + 1}</td>
              <td className="border border-slate-900 p-2 font-medium">{item.asset.assetName}</td>
              <td className="border border-slate-900 p-2 text-center">{item.asset.assetCode}</td>
              <td className="border border-slate-900 p-2 text-center">{item.quantity}</td>
              <td className="border border-slate-900 p-2">{item.conditionAtHandover}</td>
              <td className="border border-slate-900 p-2">{item.note || '--'}</td>
            </tr>
          ))}
        </PrintTable>
      </PrintSection>

      <PrintSection title="IV. CAM KẾT">
        <div className="text-justify indent-8">
          <p>
            Bên nhận đã kiểm tra kỹ tình trạng các tài sản trên và đồng ý nhận bàn giao. 
            Trong quá trình sử dụng, bên nhận có trách nhiệm bảo quản tài sản. Nếu xảy ra hư hỏng, 
            mất mát do lỗi chủ quan, bên nhận phải bồi thường theo quy định của Ban quản lý Ký túc xá.
          </p>
          {handover.note && (
            <p className="mt-2"><span className="font-semibold">Ghi chú thêm:</span> {handover.note}</p>
          )}
        </div>
      </PrintSection>

      <PrintSignatures
        leftTitle="ĐẠI DIỆN BÊN NHẬN"
        leftSubtitle={handover.student.fullName}
        rightTitle="ĐẠI DIỆN BÊN GIAO"
        rightSubtitle={handover.createdByUser?.fullName ?? '--'}
      />

      <p className="mt-10 text-right text-[11pt] italic text-slate-500">
        Thời gian in: {formatDateTime(handover.printable.generatedAt)}
      </p>
    </PrintLayout>
  );
}
