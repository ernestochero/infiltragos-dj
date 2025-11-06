-- CreateEnum
CREATE TYPE "TicketPaymentStatus" AS ENUM ('PENDING', 'FORM_READY', 'PAID', 'DECLINED', 'CANCELLED', 'ERROR', 'FULFILLED');

-- CreateTable
CREATE TABLE "TicketPayment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT,
    "issueId" TEXT,
    "quantity" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "orderCode" TEXT NOT NULL,
    "formToken" TEXT,
    "transactionUuid" TEXT,
    "providerStatus" TEXT,
    "providerMessage" TEXT,
    "rawResponse" JSONB,
    "status" "TicketPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_orderCode_key" ON "TicketPayment"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_issueId_key" ON "TicketPayment"("issueId");

-- CreateIndex
CREATE INDEX "TicketPayment_eventId_status_idx" ON "TicketPayment"("eventId", "status");

-- CreateIndex
CREATE INDEX "TicketPayment_ticketTypeId_idx" ON "TicketPayment"("ticketTypeId");

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TicketEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "TicketIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
