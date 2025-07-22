export class CreateGameDto {
    date: string;
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
    }[];
}
