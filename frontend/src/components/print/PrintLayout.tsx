import { ReactNode } from 'react';
import { Button } from '../ui/Button';

export function PrintLayout({
  title,
  onPrint,
  backAction,
  children,
}: {
  title: string;
  onPrint: () => void;
  backAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[210mm] bg-slate-50 p-6 print:p-0 print:bg-white min-h-screen">
      <style>{`
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 25mm; /* Chuẩn lề văn bản hành chính: trên 20-25, dưới 20-25, trái 30-35, phải 15-20 */
        }

        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-hidden {
            display: none !important;
          }

          .print-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="print-hidden mb-6 flex flex-wrap justify-end gap-3">
        {backAction}
        <Button onClick={onPrint}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          In biểu mẫu
        </Button>
      </div>

      <article className="print-sheet rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-slate-900 font-serif">
        {/* Chuẩn header văn bản hành chính Việt Nam */}
        <header className="mb-8 flex justify-between items-start">
          <div className="text-center">
            <p className="text-[13pt] font-semibold">BỘ THÔNG TIN VÀ TRUYỀN THÔNG</p>
            <p className="text-[13pt] font-bold underline underline-offset-4 decoration-[1.5px]">
              HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
            </p>
          </div>
          <div className="text-center">
            <p className="text-[13pt] font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-[14pt] font-bold underline underline-offset-4 decoration-[1.5px]">
              Độc lập - Tự do - Hạnh phúc
            </p>
          </div>
        </header>

        <div className="mb-8 text-center">
          <h1 className="text-[16pt] font-bold uppercase">{title}</h1>
        </div>

        <div className="text-[14pt] leading-[1.5]">
          {children}
        </div>
      </article>
    </main>
  );
}

export function PrintInfoGrid({ children }: { children: ReactNode }) {
  return <div className="mb-6 grid gap-x-8 gap-y-2 md:grid-cols-2">{children}</div>;
}

export function PrintInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export function PrintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[14pt] font-bold italic">{title}:</h2>
      <div className="text-[14pt] leading-[1.5]">{children}</div>
    </section>
  );
}

export function PrintTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse border border-slate-900 text-[13pt]">
        <thead>
          <tr>
            {headers.map((header) => (
               <th key={header} className="border border-slate-900 p-2 font-bold text-center">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function PrintSignatures({
  leftTitle,
  leftSubtitle,
  rightTitle,
  rightSubtitle,
}: {
  leftTitle: string;
  leftSubtitle?: string;
  rightTitle: string;
  rightSubtitle?: string;
}) {
  return (
    <div className="mt-12 flex justify-between px-10">
      <div className="text-center">
        <p className="font-bold">{leftTitle}</p>
        <p className="italic text-[12pt] mb-24">(Ký và ghi rõ họ tên)</p>
        <p className="font-semibold">{leftSubtitle}</p>
      </div>
      <div className="text-center">
        <p className="font-bold">{rightTitle}</p>
        <p className="italic text-[12pt] mb-24">(Ký và ghi rõ họ tên)</p>
        <p className="font-semibold">{rightSubtitle}</p>
      </div>
    </div>
  );
}
