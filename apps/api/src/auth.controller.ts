import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class RegisterDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; @IsString() @MinLength(2) name!: string; @IsString() @MinLength(2) tenantName!: string; }
class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
class RefreshDto { @IsString() refreshToken!: string; }
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Post('login') login(@Body() body: LoginDto) { return this.auth.login(body.email, body.password); }
  @Post('refresh') refresh(@Body() body: RefreshDto) { return this.auth.refresh(body.refreshToken); }
  @Post('logout') logout(@Body() body: RefreshDto) { return this.auth.revoke(body.refreshToken); }
}
