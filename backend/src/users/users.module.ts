import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [UsersController, StudentsController],
  providers: [UsersService, StudentsService],
  exports: [UsersService, StudentsService],
})
export class UsersModule {}
