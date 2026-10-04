import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { RedisService } from './redis.service';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'change-me', signOptions: { expiresIn: '12h' } })],
  controllers: [HealthController, AuthController, InstancesController],
  providers: [PrismaService, AuthService, InstancesService, RedisService, PermissionGuard],
})
export class AppModule {}
