import React from 'react';
import { HandoverExportResponse } from '../../types/handovers';

interface PrintHandoverRecordProps {
  data: HandoverExportResponse | null;
}

export const PrintHandoverRecord = React.forwardRef<HTMLDivElement, PrintHandoverRecordProps>(
  ({ data }, ref) => {
    if (!data) return null;

    const groupedItems = React.useMemo(() => {
      if (!data?.handoverItems) return [];
      const groups = new Map<string, { assetName: string, quantity: number, condition: string }>();
      
      data.handoverItems.forEach(item => {
        const key = `${item.asset.assetName}|${item.conditionAtHandover}`;
        if (groups.has(key)) {
          const existing = groups.get(key)!;
          existing.quantity += item.quantity;
        } else {
          groups.set(key, {
            assetName: item.asset.assetName,
            quantity: item.quantity,
            condition: item.conditionAtHandover,
          });
        }
      });
      return Array.from(groups.values());
    }, [data]);

    return (
      <div ref={ref} className="hidden print:block p-8 bg-white text-black font-serif print-content">
        {/* Header - Quốc hiệu */}
        <div className="flex justify-between mb-8">
          <div className="text-center font-bold">
            <p>HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG</p>
            <p>BAN QUẢN LÝ KÝ TÚC XÁ</p>
            <div className="w-1/2 h-px bg-black mx-auto mt-1"></div>
          </div>
          <div className="text-center font-bold">
            <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <div className="w-1/2 h-px bg-black mx-auto mt-1"></div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 uppercase">{data.printable.title}</h1>
          <p className="italic">Mã số: {data.handoverCode}</p>
          <p className="italic">Ngày lập: {data.printable.generatedAt}</p>
        </div>

        {/* Information */}
        <div className="mb-6 space-y-2">
          <h2 className="font-bold uppercase mb-2">I. Thông tin chung</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-semibold">Bên giao:</span> Ban quản lý Ký túc xá</p>
              <p><span className="font-semibold">Người lập:</span> {data.createdByUser?.fullName}</p>
            </div>
            <div>
              <p><span className="font-semibold">Bên nhận:</span> Sinh viên {data.printable.studentLabel}</p>
              <p><span className="font-semibold">Phòng:</span> {data.printable.roomLabel}</p>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="mb-8">
          <h2 className="font-bold uppercase mb-2">II. Danh sách tài sản</h2>
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr>
                <th className="border border-black p-2 text-center w-12">STT</th>
                <th className="border border-black p-2 text-left">Tên tài sản</th>
                <th className="border border-black p-2 text-center">Số lượng</th>
                <th className="border border-black p-2 text-left">Tình trạng (Khi giao)</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">{item.assetName}</td>
                  <td className="border border-black p-2 text-center">{item.quantity}</td>
                  <td className="border border-black p-2">{item.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer - Signatures */}
        <div className="flex justify-between mt-12 px-8">
          <div className="text-center">
            <p className="font-bold mb-16">Bên giao (Ký, ghi rõ họ tên)</p>
            <p>{data.createdByUser?.fullName}</p>
          </div>
          <div className="text-center">
            <p className="font-bold mb-16">Bên nhận (Ký, ghi rõ họ tên)</p>
            <p>{data.student.fullName}</p>
          </div>
        </div>

        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print-content, .print-content * { visibility: visible; }
            .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />
      </div>
    );
  }
);
