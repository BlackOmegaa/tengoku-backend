// game.controller.ts
import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { GameService } from './game.services';
import { CreateGameDto } from './dto/create-game.dto';

@Controller('games')
export class GameController {
    constructor(private readonly gameService: GameService) { }

    @Post()
    async createGame(@Body() dto: CreateGameDto) {
        return this.gameService.createGameWithPlayers(dto);
    }

    @Get('history/:puuid')
    async getUserGameHistory(@Param('puuid') puuid: string,) {
        if (!puuid) { console.log('PUUID manquant') };
        return this.gameService.getGameHistoryForUser(puuid);
    }

    @Get('leaderboard')
    async getLeaderboard() {
        return this.gameService.getLeaderboard();
    }

}
