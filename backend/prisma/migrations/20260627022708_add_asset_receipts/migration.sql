-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('IMPORT', 'EXPORT');

-- CreateTable
CREATE TABLE "asset_receipts" (
    "id" SERIAL NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "type" "ReceiptType" NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT,
    "supplierAddress" TEXT,
    "supplierPhone" TEXT,
    "contractNumber" TEXT,
    "documentNumber" TEXT,
    "totalAmount" DECIMAL(12,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "asset_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_receipt_items" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2),
    "warrantyMonths" INTEGER DEFAULT 0,
    "note" TEXT,
    "receiptId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "asset_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_receipts_receiptCode_key" ON "asset_receipts"("receiptCode");

-- AddForeignKey
ALTER TABLE "asset_receipts" ADD CONSTRAINT "asset_receipts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receipt_items" ADD CONSTRAINT "asset_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "asset_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receipt_items" ADD CONSTRAINT "asset_receipt_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
