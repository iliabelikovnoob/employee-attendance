-- Добавление нового значения WEEKEND в enum AttendanceStatus
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'WEEKEND';

-- Создание таблицы schedule_swap_requests
CREATE TABLE IF NOT EXISTS "schedule_swap_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requesterOldStatus" "AttendanceStatus" NOT NULL,
    "requesterNewStatus" "AttendanceStatus" NOT NULL,
    "targetOldStatus" "AttendanceStatus" NOT NULL,
    "targetNewStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "targetApproved" BOOLEAN NOT NULL DEFAULT false,
    "adminReviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_swap_requests_pkey" PRIMARY KEY ("id")
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_requesterId_idx" ON "schedule_swap_requests"("requesterId");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_targetUserId_idx" ON "schedule_swap_requests"("targetUserId");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_date_idx" ON "schedule_swap_requests"("date");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_status_idx" ON "schedule_swap_requests"("status");

-- Добавление внешних ключей
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_adminReviewedBy_fkey" FOREIGN KEY ("adminReviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
