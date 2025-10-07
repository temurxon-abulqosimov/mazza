import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class SellerAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService){}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['authorization']?.split(' ')[1]
    
    if(!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const decode = this.jwtService.verify(token);
      if(decode.role !== "SELLER"){
        throw new UnauthorizedException('Access denied. Seller role required.');
      }
      req.user = decode;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
