import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    // 🔹 Récupère un user avec ses parties jouées
    async getUserWithGames(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                players: {
                    include: {
                        game: true,
                    },
                },
            },
        });
    }

    async findOrCreateByPuuid({
        puuid,
        gameName,
        tagLine,
        summonerLevel,
        profileIconId,
    }: {
        puuid: string;
        gameName: string;
        tagLine: string;
        summonerLevel: number;
        profileIconId: number;
    }) {
        if (!puuid) throw new Error('PUUID manquant.');

        const existingUser = await this.prisma.user.findUnique({
            where: { puuid },
        });

        if (existingUser) return existingUser;

        return this.prisma.user.create({
            data: {
                puuid,
                gameName,
                tagLine,
                summonerLevel,
                profileIconId,
            },
        });
    }

    async updateUserTPByPuuid(puuid: string, tpChange: number) {


        function computeRankFromTP(tp: number): string {
            if (tp >= 1500) return 'TengokuMaster';
            if (tp >= 1000) return 'Diamant';
            if (tp >= 500) return 'Platine';
            if (tp >= 300) return 'Gold';
            if (tp >= 200) return 'Silver';
            return 'Bronze';
        }



        if (!puuid) throw new Error('PUUID manquant.');

        const user = await this.prisma.user.findUnique({ where: { puuid } });
        if (!user) throw new Error('User non trouvé');

        const delta = Number(tpChange) || 0;
        const newTP = Math.max(0, user.tp + delta);
        const newRank = computeRankFromTP(newTP); // optionnel

        return this.prisma.user.update({
            where: { puuid },
            data: {
                tp: newTP,
                // rank: newRank,
            },
        });
    }





    async findByPuuid(puuid: string) {
        return this.prisma.user.findUnique({
            where: { puuid },
            include: {
                players: {
                    include: {
                        game: true,
                    },
                },
            },
        });
    }
}
