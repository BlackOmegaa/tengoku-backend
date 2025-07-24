// src/game/game.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
    constructor(private prisma: PrismaService) { }

    async createGameWithPlayers(dto: CreateGameDto) {

        const existing = await this.prisma.game.findUnique({
            where: { externalId: dto.gameId },
        });

        if (existing) {
            return { message: '⚠️ Game déjà enregistrée (duplication évitée).' };
        }

        const game = await this.prisma.game.create({
            data: {
                externalId: dto.gameId,
                date: new Date(dto.date),
            },
        });

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

            const teamPlayers = dto.players.filter(p => p.isWinner === player.isWinner);
            const tpChange = this.calculateTPChange(player, teamPlayers);

            await this.prisma.playerInGame.create({
                data: {
                    userId: user.id,
                    gameId: game.id,
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
        teamPlayers: CreateGameDto['players']
    ): number {
        if (player.wasAfk) return -20;

        const deaths = Math.max(player.deaths, 1);
        const kdaScore = ((player.kills + player.assists) / deaths) * 2;
        const damageScore = (player.damageDealt / 1000) * 1.2;
        const tankScore = (player.damageTaken / 1000) * 0.8;
        const healScore = (player.healOnTeammates / 1000) * 1.0;
        const shieldScore = (player.shieldOnTeammates / 1000) * 1.0;
        const ccScore = (player.ccScore / 10) * 1.0;
        const objectiveScore = (player.killingSpree * 0.8) + (player.multiKill * 2);

        const teamfightParticipation = (player.kills + player.assists) / Math.max(1, teamPlayers.length * 10);
        const tfScore = teamfightParticipation * 5;

        const impactScore =
            kdaScore +
            damageScore +
            tankScore +
            healScore +
            shieldScore +
            ccScore +
            objectiveScore +
            tfScore;

        const teamScores = teamPlayers.map(p => {
            const d = Math.max(p.deaths, 1);
            const tf = (p.kills + p.assists) / Math.max(1, teamPlayers.length * 10);
            return ((p.kills + p.assists) / d) * 2 +
                (p.damageDealt / 1000) * 1.2 +
                (p.damageTaken / 1000) * 0.8 +
                (p.healOnTeammates / 1000) * 1.0 +
                (p.shieldOnTeammates / 1000) * 1.0 +
                (p.ccScore / 10) * 1.0 +
                (p.killingSpree * 0.8) +
                (p.multiKill * 2) +
                (tf * 5);
        });

        const avgTeamScore = this.avg(teamScores);
        const delta = impactScore - avgTeamScore;

        let tp = player.isWinner ? 20 : -12;

        if (delta > 10) tp += 3;
        else if (delta > 5) tp += 2;
        else if (delta < -10) tp -= 6;
        else if (delta < -5) tp -= 3;

        tp = Math.max(-15, Math.min(25, Math.round(tp)));
        if (player.isWinner) tp = Math.max(tp, 15);

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
