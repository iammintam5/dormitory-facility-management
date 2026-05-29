import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    const isAuthorized = user && requiredRoles.includes(user.role);
    
    console.log('[RolesGuard] Role check:', {
      userRole: user?.role,
      requiredRoles,
      isAuthorized,
      userId: user?.userId,
      userCode: user?.userCode,
      endpoint: `${context.switchToHttp().getRequest().method} ${context.switchToHttp().getRequest().url}`,
    });

    if (!isAuthorized) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay.');
    }

    return true;
  }
}
