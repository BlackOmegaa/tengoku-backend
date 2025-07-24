// src/game/game.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
    constructor(private prisma: PrismaService) { }

    async createGameWithPlayers(dto: CreateGameDto) {
        const gameIdAsInt = BigInt(dto.gameId);

        const existing = await this.prisma.game.findUnique({
            where: { externalId: gameIdAsInt },
        });

        if (existing) {
            return { message: '⚠️ Game déjà enregistrée (duplication évitée).' };
        }

        const game = await this.prisma.game.create({
            data: {
                externalId: gameIdAsInt,
                date: new Date(dto.date),
            },
        });

        const winners = dto.players.filter(p => p.isWinner);
        const losers = dto.players.filter(p => !p.isWinner);

        const avgGoldWinners = this.avg(winners.map(p => p.gold));
        const avgGoldLosers = this.avg(losers.map(p => p.gold));
        const avgDmgWinners = this.avg(winners.map(p => p.damageDealt));
        const avgDmgLosers = this.avg(losers.map(p => p.damageDealt));

        for (const player of dto.players) {
            const user = await this.prisma.user.upsert({
                where: { puuid: player.puuid },
                update: {
                    gameName: player.gameName,
                    tagLine: player.tagLine,
                    profileIconId: player.profileIconId,
                    summonerLevel: player.level,
                },
                create: {
                    puuid: player.puuid,
                    gameName: player.gameName,
                    tagLine: player.tagLine,
                    profileIconId: player.profileIconId,
                    summonerLevel: player.level,
                },
            });

            const tpChange = this.calculateTPChange(player, {
                avgGold: player.isWinner ? avgGoldWinners : avgGoldLosers,
                avgDmg: player.isWinner ? avgDmgWinners : avgDmgLosers,
            });

            await this.prisma.playerInGame.create({
                data: {
                    userId: user.id,
                    gameId: game.id, // ← ça reste une string (relation via `id`)
                    champion: player.champion,
                    isWinner: player.isWinner,
                    kills: player.kills,
                    deaths: player.deaths,
                    assists: player.assists,
                    cs: player.cs,
                    gold: player.gold,
                    damageDealt: player.damageDealt,
                    damageTaken: player.damageTaken,
                    tpChange,
                },
            });

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    tp: Math.max(user.tp + tpChange, 0),
                },
            });
        }

        return { message: 'Game, joueurs et TP enregistrés avec succès.' };
    }



    private avg(arr: number[]): number {
        return arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
    }

    private calculateTPChange(
        player: CreateGameDto['players'][0],
        teamStats: { avgGold: number; avgDmg: number },
    ): number {
        let tp = player.isWinner ? 20 : -15;

        if (player.gold > teamStats.avgGold + 300) tp += 5;
        else if (player.gold < teamStats.avgGold - 300) tp -= 5;

        if (player.damageDealt > teamStats.avgDmg * 1.15) tp += 5;
        else if (player.damageDealt < teamStats.avgDmg * 0.85) tp -= 5;

        const deaths = player.deaths || 1;
        const kda = (player.kills + player.assists) / deaths;
        if (kda > 4) tp += 5;
        else if (kda < 1) tp -= 5;

        return tp;
    }

    async getGameHistoryForUser(puuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { puuid },
        });

        if (!user) throw new NotFoundException('Utilisateur non trouvé');

        const participations = await this.prisma.playerInGame.findMany({
            where: { userId: user.id },
            include: {
                game: {
                    include: {
                        players: {
                            include: { user: true },
                        },
                    },
                },
            },
            orderBy: {
                game: {
                    date: 'desc',
                },
            },
        });

        return participations.map(p => {
            const game = p.game;

            const self = {
                champion: p.champion,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                cs: p.cs,
                gold: p.gold,
                damageDealt: p.damageDealt,
                damageTaken: p.damageTaken,
                isWinner: p.isWinner,
                tpChange: p.tpChange,
            };

            const winners = game.players
                .filter(pg => pg.isWinner)
                .map(pg => ({
                    puuid: pg.user.puuid,
                    gameName: pg.user.gameName,
                    tagLine: pg.user.tagLine,
                    profileIconId: pg.user.profileIconId, // ✅ ajouté ici
                    champion: pg.champion,
                    kills: pg.kills,
                    deaths: pg.deaths,
                    assists: pg.assists,
                    cs: pg.cs,
                    gold: pg.gold,
                    damageDealt: pg.damageDealt,
                    damageTaken: pg.damageTaken,
                }));

            const losers = game.players
                .filter(pg => !pg.isWinner)
                .map(pg => ({
                    puuid: pg.user.puuid,
                    gameName: pg.user.gameName,
                    tagLine: pg.user.tagLine,
                    profileIconId: pg.user.profileIconId, // ✅ ajouté ici
                    champion: pg.champion,
                    kills: pg.kills,
                    deaths: pg.deaths,
                    assists: pg.assists,
                    cs: pg.cs,
                    gold: pg.gold,
                    damageDealt: pg.damageDealt,
                    damageTaken: pg.damageTaken,
                }));

            return {
                gameId: game.id,
                date: game.date,
                self,
                teams: {
                    winners,
                    losers,
                },
            };
        });
    }


    async getLeaderboard() {
        return this.prisma.user.findMany({
            orderBy: {
                tp: 'desc',
            },
            select: {
                id: true,
                gameName: true,
                profileIconId: true,
                tp: true,
            },
        });
    }
}
