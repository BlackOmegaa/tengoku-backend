// src/game/game.module.ts
import { Module } from '@nestjs/common';
import { GameService } from './game.services';
import { GameController } from './game.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [GameService],
    controllers: [GameController],
})
export class GameModule { }
