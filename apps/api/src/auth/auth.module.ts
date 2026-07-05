import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, PasswordService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, AuthTokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
