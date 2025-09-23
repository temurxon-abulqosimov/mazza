import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
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
    if(!token) return false

    const decode = this.jwtService.verify(token)
    if(decode.role !== "SELLER"){
        return false
    }
    req.user = decode
    return true
  }
}
