import { ReactNode } from 'react';
import { formatDate, formatDateTime } from '../../../lib/format';
import { LiquidationRecordExportResponse } from '../../../types/liquidation-records';
import {
  PrintLayout,
  PrintSection,
  PrintSignatures,
} from '../PrintLayout';

export function LiquidationRecordPrintForm({
  record,
  onPrint,
  backAction,
}: {
  record: LiquidationRecordExportResponse;
  onPrint: () => void;
  backAction?: ReactNode;
}) {
  return (
    <PrintLayout title="BIÊN BẢN THANH LÝ TÀI SẢN" onPrint={onPrint} backAction={backAction}>
      <div className="mb-6 text-center italic">
        <p>Mã biên bản: {record.liquidationCode}</p>
        <p>Hôm nay, ngày {formatDate(record.liquidationDate)}, chúng tôi tiến hành lập biên bản thanh lý tài sản:</p>
      </div>

      <PrintSection title="I. THÔNG TIN TÀI SẢN">
        <div className="space-y-2">
          <p><span className="font-semibold">Tên tài sản:</span> {record.liquidationItems[0]?.asset.assetName}</p>
          <p><span className="font-semibold">Mã tài sản:</span> {record.liquidationItems[0]?.asset.assetCode}</p>
          <p><span className="font-semibold">Loại tài sản:</span> {record.liquidationItems[0]?.asset?.category?.name}</p>
          <p><span className="font-semibold">Vị trí:</span> {record.liquidationItems[0]?.asset.room?.roomCode ?? '--'} / {record.liquidationItems[0]?.asset.room?.floor?.building?.name ?? '--'}</p>
          <p><span className="font-semibold">Giá trị còn lại (ước tính):</span> {record.liquidationItems[0]?.estimatedRemainingValue ? `${record.liquidationItems[0]?.estimatedRemainingValue} VNĐ` : 'Không xác định'}</p>
        </div>
      </PrintSection>

      <PrintSection title="II. TÌNH TRẠNG VÀ LÝ DO THANH LÝ">
        <div className="space-y-4 text-justify indent-8">
          <p><span className="font-semibold underline">Tình trạng tài sản:</span> {record.liquidationItems[0]?.assetCondition}</p>
          <p><span className="font-semibold underline">Lý do thanh lý:</span> {record.liquidationItems[0]?.reason}</p>
        </div>
      </PrintSection>

      <PrintSection title="III. KẾT LUẬN">
        <div className="text-justify indent-8">
          <p>
            Căn cứ vào tình trạng thực tế của tài sản và quy định của Học viện, chúng tôi thống nhất đề xuất thanh lý
            tài sản nêu trên. Kính đề nghị Ban Giám đốc/Ban quản lý xem xét và phê duyệt.
          </p>
          {record.note && (
            <p className="mt-2"><span className="font-semibold">Ghi chú bổ sung:</span> {record.note}</p>
          )}
        </div>
      </PrintSection>

      {(!record.councilMembers || record.councilMembers.length === 0) ? (
        <PrintSignatures
          leftTitle="NGƯỜI LẬP BIÊN BẢN"
          leftSubtitle={record.createdByUser.fullName}
          rightTitle="ĐẠI DIỆN BAN QUẢN LÝ"
          rightSubtitle=""
        />
      ) : (
        <div className="no-break mt-9 flex flex-wrap justify-between px-6 text-[13pt] gap-y-10 gap-x-4">
          {record.councilMembers.map((member) => (
            <div key={member.user.id} className="w-[30%] text-center">
              <p className="font-bold uppercase">{member.roleInCouncil}</p>
              <p className="mb-16 text-[12pt] italic">(Ký và ghi rõ họ tên)</p>
              <p className="font-semibold">{member.user.fullName}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-right text-[11pt] italic text-slate-500">
        Thời gian in: {formatDateTime(record.printable.generatedAt)}
      </p>
    </PrintLayout>
  );
}
