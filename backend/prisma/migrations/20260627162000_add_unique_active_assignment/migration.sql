CREATE UNIQUE INDEX "idx_active_assignment" ON "room_student_assignments" ("studentId") WHERE "isActive" = true;
