import { ReactNode } from 'react';
import { formatDateTime } from '../../../lib/format';
import { DamageReportExportResponse } from '../../../types/damage-reports';
import {
  PrintLayout,
  PrintSection,
  PrintSignatures,
} from '../PrintLayout';

export function DamageReportPrintForm({
  report,
  onPrint,
  backAction,
}: {
  report: DamageReportExportResponse;
  onPrint: () => void;
  backAction?: ReactNode;
}) {
  return (
    <PrintLayout title="PHIẾU YÊU CẦU SỬA CHỮA TÀI SẢN" onPrint={onPrint} backAction={backAction}>
      <div className="mb-6 text-center italic">
        <p>Mã phiếu: {report.reportCode}</p>
        <p>Thời điểm báo cáo: {formatDateTime(report.createdAt)}</p>
      </div>

      <PrintSection title="I. THÔNG TIN NGƯỜI BÁO CÁO">
        <div className="space-y-2">
          <p><span className="font-semibold">Họ và tên:</span> {report.reporter?.fullName ?? '--'}</p>
          <p><span className="font-semibold">Mã sinh viên:</span> {report.reporter?.userCode ?? '--'}</p>
          <p><span className="font-semibold">Phòng:</span> {report.room?.roomCode ?? '--'}</p>
        </div>
      </PrintSection>

      <PrintSection title="II. NỘI DUNG YÊU CẦU SỬA CHỮA">
        <div className="space-y-4">
          <p><span className="font-semibold">Tên tài sản báo hỏng:</span> {report.asset?.assetName ?? '--'} ({report.asset?.assetCode ?? '--'})</p>
          <p><span className="font-semibold">Mức độ ưu tiên:</span> {report.priority}</p>
          <div className="mt-2 text-justify indent-8">
            <span className="font-semibold underline">Mô tả chi tiết tình trạng hư hỏng:</span> 
            <p className="mt-1">{report.description}</p>
          </div>
        </div>
      </PrintSection>

      <PrintSection title="III. TIẾP NHẬN VÀ XỬ LÝ (Dành cho Ban quản lý)">
        <div className="space-y-4">
          <p><span className="font-semibold">Trạng thái hiện tại:</span> {report.status}</p>
          <div className="min-h-[100px] border border-dashed border-slate-400 p-4 mt-2">
            <p className="text-slate-500 italic">Ghi chú của bộ phận kỹ thuật / Ban quản lý...</p>
          </div>
        </div>
      </PrintSection>

      <PrintSignatures
        leftTitle="NGƯỜI BÁO CÁO"
        leftSubtitle={report.reporter?.fullName ?? ''}
        rightTitle="ĐẠI DIỆN BAN QUẢN LÝ / KỸ THUẬT"
        rightSubtitle=""
      />

      <p className="mt-10 text-right text-[11pt] italic text-slate-500">
        Thời gian in: {formatDateTime(report.printable.generatedAt)}
      </p>
    </PrintLayout>
  );
}
