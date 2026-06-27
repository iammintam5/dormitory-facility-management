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
    <main className="bg-slate-50 print:bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 30mm;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: "Times New Roman", Times, serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          * {
            box-sizing: border-box;
          }

          .print-hidden {
            display: none !important;
          }

          body * {
            visibility: hidden;
          }

          .print-sheet,
          .print-sheet * {
            visibility: visible;
          }

          .print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }

          p,
          span,
          div,
          h1,
          h2,
          h3,
          table,
          th,
          td {
            letter-spacing: normal !important;
            word-spacing: normal !important;
            white-space: normal !important;
          }

          .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-hidden mx-auto mb-5 flex max-w-[210mm] flex-wrap justify-end gap-3 pt-4">
        {backAction}

        <Button onClick={onPrint}>
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          In biểu mẫu
        </Button>
      </div>

      <article
        className="print-sheet mx-auto box-border min-h-[297mm] w-[210mm] bg-white pt-[20mm] pr-[15mm] pb-[20mm] pl-[30mm] text-slate-900 shadow-xl"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          lineHeight: 1.45,
        }}
      >
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="w-1/2 text-center">
            <p className="text-[13pt] font-semibold leading-[1.2]">
              BỘ THÔNG TIN VÀ TRUYỀN THÔNG
            </p>
            <p className="text-[13pt] font-bold leading-[1.2]">
              HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG CƠ SỞ TẠI THÀNH PHỐ HỒ CHÍ MINH
            </p>
            <div className="mx-auto mt-1 h-[1.5px] w-[60%] bg-black"></div>
          </div>

          <div className="w-1/2 text-center">
            <p className="text-[13pt] font-bold leading-[1.2]">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-[14pt] font-bold leading-[1.2]">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="mx-auto mt-1 h-[1.5px] w-[75%] bg-black"></div>
          </div>
        </header>

        <div className="mb-7 text-center">
          <h1 className="text-[16pt] font-bold uppercase leading-[1.35]">
            {title}
          </h1>
        </div>

        <div className="text-[14pt]">
          {children}
        </div>
      </article>
    </main>
  );
}

export function PrintInfoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 grid gap-x-8 gap-y-1 md:grid-cols-2">
      {children}
    </div>
  );
}

export function PrintInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
    <section className="mb-5">
      <h2 className="mb-2 text-[14pt] font-bold italic leading-[1.35]">
        {title}:
      </h2>

      <div className="text-[14pt]" style={{ lineHeight: 1.45 }}>
        {children}
      </div>
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
    <div className="mb-5">
      <table className="w-full border-collapse border border-slate-900 text-[13pt]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="border border-slate-900 p-2 text-center font-bold"
              >
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
    <div className="no-break mt-9 flex justify-between px-6 text-[13pt]">
      <div className="w-1/2 text-center">
        <p className="font-bold">{leftTitle}</p>
        <p className="mb-16 text-[12pt] italic">(Ký và ghi rõ họ tên)</p>
        {leftSubtitle && <p className="font-semibold">{leftSubtitle}</p>}
      </div>

      <div className="w-1/2 text-center">
        <p className="font-bold">{rightTitle}</p>
        <p className="mb-16 text-[12pt] italic">(Ký và ghi rõ họ tên)</p>
        {rightSubtitle && <p className="font-semibold">{rightSubtitle}</p>}
      </div>
    </div>
  );
}
