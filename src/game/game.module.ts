// src/game/game.module.ts
import { Module } from '@nestjs/common';
import { GameService } from './game.services';
import { GameController } from './game.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordWebhookService } from 'src/discord/discord-webhook.service';

@Module({
    imports: [PrismaModule],
    providers: [GameService, DiscordWebhookService],
    controllers: [GameController],
})
export class GameModule { }
