export class CreateGameDto {
    date: string;
    gameId: string;

    players: {
        puuid: string;
        gameName: string;
        tagLine: string;
        profileIconId: number;
        level: number;
        champion: string;
        isWinner: boolean;
        kills: number;
        deaths: number;
        assists: number;
        cs: number;
        gold: number;
        damageDealt: number;
        damageTaken: number;
        tpChange: number;

        // Champs additionnels pour le calcul des TP uniquement (pas stockés en DB)
        healOnTeammates: number;
        shieldOnTeammates: number;
        ccScore: number;
        wasAfk: number;
        physicalDamageTaken: number;
        multiKill: number;
        killingSpree: number;
    }[];
}
