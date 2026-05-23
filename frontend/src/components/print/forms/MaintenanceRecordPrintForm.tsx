import { ReactNode } from 'react';
import { formatDate, formatDateTime } from '../../../lib/format';
import { MaintenanceRecordExportResponse } from '../../../types/maintenance';
import {
  PrintLayout,
  PrintSection,
  PrintSignatures,
} from '../PrintLayout';

export function MaintenanceRecordPrintForm({
  record,
  onPrint,
  backAction,
}: {
  record: MaintenanceRecordExportResponse;
  onPrint: () => void;
  backAction?: ReactNode;
}) {
  return (
    <PrintLayout title="PHIẾU GHI NHẬN BẢO TRÌ TÀI SẢN" onPrint={onPrint} backAction={backAction}>
      <div className="mb-6 text-center italic">
        <p>Mã phiếu: {record.maintenanceCode}</p>
        <p>Hôm nay, ngày {formatDate(record.maintenanceDate)}, chúng tôi tiến hành bảo trì tài sản với các thông tin sau:</p>
      </div>

      <PrintSection title="I. THÔNG TIN CHUNG">
        <div className="space-y-2">
          <p><span className="font-semibold">Tên tài sản:</span> {record.asset.assetName} ({record.asset.assetCode})</p>
          <p><span className="font-semibold">Loại bảo trì:</span> {record.maintenanceType}</p>
          <p><span className="font-semibold">Người thực hiện:</span> {record.performedByUser.fullName}</p>
          <p><span className="font-semibold">Ngày dự kiến bảo trì tiếp theo:</span> {formatDate(record.nextMaintenanceDate)}</p>
        </div>
      </PrintSection>

      <PrintSection title="II. NỘI DUNG VÀ KẾT QUẢ BẢO TRÌ">
        <div className="space-y-4 text-justify indent-8">
          <p><span className="font-semibold underline">Nội dung thực hiện:</span> {record.content}</p>
          <p><span className="font-semibold underline">Tình trạng sau bảo trì (Kết quả):</span> {record.resultStatus}</p>
        </div>
      </PrintSection>

      <PrintSection title="III. VẬT TƯ & CHI PHÍ (NẾU CÓ)">
        <div className="space-y-2">
          <p><span className="font-semibold">Chi phí thực hiện:</span> {record.cost ? `${record.cost} VNĐ` : 'Không phát sinh'}</p>
          <p><span className="font-semibold">Vật tư thay thế/Ghi chú kỹ thuật:</span> {record.materialNote || 'Không phát sinh'}</p>
        </div>
      </PrintSection>

      <PrintSection title="IV. GHI CHÚ CHUNG">
        <div className="text-justify indent-8">
          <p>{record.note || 'Không có ghi chú bổ sung.'}</p>
        </div>
      </PrintSection>

      <PrintSignatures
        leftTitle="NGƯỜI THỰC HIỆN BẢO TRÌ"
        leftSubtitle={record.performedByUser.fullName}
        rightTitle="ĐẠI DIỆN BAN QUẢN LÝ"
        rightSubtitle="Xác nhận hoàn tất"
      />

      <p className="mt-10 text-right text-[11pt] italic text-slate-500">
        Thời gian in: {formatDateTime(record.printable.generatedAt)}
      </p>
    </PrintLayout>
  );
}
