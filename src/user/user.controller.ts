import {
    Controller,
    Get,
    Param,
    Post,
    Body,
    Patch,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    // 🔹 GET /users/:id → par ID
    @Get(':id')
    async getUser(@Param('id', ParseIntPipe) id: string) {
        const user = await this.userService.getUserWithGames(id);
        if (!user) throw new NotFoundException('Utilisateur non trouvé.');
        return user;
    }

    // 🔹 GET /users/by-puuid/:puuid → via PUUID
    @Get('by-puuid/:puuid')
    async getUserByPuuid(@Param('puuid') puuid: string) {
        const user = await this.userService.findByPuuid(puuid);
        if (!user) throw new NotFoundException('Utilisateur non trouvé.');
        return user;
    }

    // PATCH /users/by-puuid/:puuid/tp
    @Patch('tp-by-puuid/:puuid')
    async updateTPByPuuid(
        @Param('puuid') puuid: string,
        @Body() body: { tpChange: number },
    ) {
        return this.userService.updateUserTPByPuuid(puuid, body.tpChange);
    }


    // 🔹 POST /users/login-or-create → login ou création via PUUID
    @Post('login-or-create')
    async loginOrCreate(@Body() body: {
        puuid: string;
        gameName: string;
        tagLine: string;
        summonerLevel: number;
        profileIconId: number;
    }) {
        if (!body.puuid) throw new Error('Le champ puuid est requis dans le body.');
        return this.userService.findOrCreateByPuuid(body);
    }
}
