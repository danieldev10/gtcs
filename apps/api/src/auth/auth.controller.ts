import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: unknown) {
    return this.authService.signup(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.authService.login(body);
  }

  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() body: unknown) {
    return this.authService.verifyEmail(body);
  }

  @Get('verify-email')
  verifyEmailFromLink(@Query('token') token: string) {
    return this.authService.verifyEmail({ token });
  }

  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@Body() body: unknown) {
    return this.authService.resendVerification(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user);
  }
}
