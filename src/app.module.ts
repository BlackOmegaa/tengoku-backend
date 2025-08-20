import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { DebugModule } from './debug/debug.module';
import { DiscordWebhookModule } from './discord/discord-webhook.module';

@Module({
  imports: [UserModule, PrismaModule, GameModule, DebugModule, DiscordWebhookModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService]
})
export class AppModule { }
