// src/discord/discord-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';

type GamePayload = {
    date: string;
    gameId: string;
    players: Array<{
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
        // champs “TP calc” inutilisés ici volontairement
        healOnTeammates?: number;
        shieldOnTeammates?: number;
        ccScore?: number;
        wasAfk?: number;
        physicalDamageTaken?: number;
        multiKill?: number;
        killingSpree?: number;
    }>;
};

@Injectable()
export class DiscordWebhookService {
    private readonly logger = new Logger(DiscordWebhookService.name);
    private readonly webhookUrl = process.env.DISCORD_GAME_WEBHOOK_URL;
    // Optionnel : personaliser le nom/avatar du webhook
    private readonly username = process.env.DISCORD_GAME_WEBHOOK_NAME ?? 'Tengoku Tracker';
    private readonly avatarUrl = process.env.DISCORD_GAME_WEBHOOK_AVATAR ?? undefined;

    // ===== utils
    private fmt(n: number | undefined | null) {
        if (n == null || Number.isNaN(n)) return '0';
        return n.toLocaleString('fr-FR');
    }
    private kdaRatio(k: number, d: number, a: number) {
        const denom = Math.max(1, d);
        return ((k + a) / denom).toFixed(2);
    }
    private sum(arr: number[]) {
        return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    }
    private chunk1024(s: string): string[] {
        const out: string[] = [];
        for (let i = 0; i < s.length; i += 1024) out.push(s.slice(i, i + 1024));
        return out;
    }
    private tpBadge(tp: number) {
        if (tp > 0) return `📈 **+${tp} TP**`;
        if (tp < 0) return `📉 **${tp} TP**`;
        return `➖ **${tp} TP**`;
    }

    // ===== format
    private teamTotals(players: GamePayload['players']) {
        const kills = this.sum(players.map(p => p.kills));
        const deaths = this.sum(players.map(p => p.deaths));
        const assists = this.sum(players.map(p => p.assists));
        const cs = this.sum(players.map(p => p.cs));
        const gold = this.sum(players.map(p => p.gold));
        const dmgOut = this.sum(players.map(p => p.damageDealt));
        const dmgIn = this.sum(players.map(p => p.damageTaken));
        const kdaR = this.kdaRatio(kills, deaths, assists);
        return { kills, deaths, assists, cs, gold, dmgOut, dmgIn, kdaR };
    }

    private playerLine(p: GamePayload['players'][number]) {
        const name = `${p.gameName}#${p.tagLine}`;
        const kdaR = this.kdaRatio(p.kills, p.deaths, p.assists);
        return [
            `• **${name}** — *${p.champion}* (L${p.level})`,
            `│ ⚔️ **${p.kills}**  💀 **${p.deaths}**  🤝 **${p.assists}**  *(KDA ${kdaR})*`,
            `│ 🌾 **CS** ${this.fmt(p.cs)}  🪙 **${this.fmt(p.gold)}**  🔥 **${this.fmt(p.damageDealt)}** / 🩸 **${this.fmt(p.damageTaken)}**`,
            `│ ${this.tpBadge(p.tpChange)}`
        ].join('\n');
    }

    private buildSingleEmbed(dto: GamePayload) {
        const winners = dto.players.filter(p => p.isWinner);
        const losers = dto.players.filter(p => !p.isWinner);

        const winTot = this.teamTotals(winners);
        const loseTot = this.teamTotals(losers);

        const winHeader =
            `🏆 **Équipe Vainqueurs**\n` +
            `K/D/A: **${this.fmt(winTot.kills)}/${this.fmt(winTot.deaths)}/${this.fmt(winTot.assists)}** *(KDA ${winTot.kdaR})* • ` +
            `🌾 CS **${this.fmt(winTot.cs)}** • 🪙 **${this.fmt(winTot.gold)}** • 🔥/**🩸** **${this.fmt(winTot.dmgOut)}**/**${this.fmt(winTot.dmgIn)}**`;

        const loseHeader =
            `💔 **Équipe Perdants**\n` +
            `K/D/A: **${this.fmt(loseTot.kills)}/${this.fmt(loseTot.deaths)}/${this.fmt(loseTot.assists)}** *(KDA ${loseTot.kdaR})* • ` +
            `🌾 CS **${this.fmt(loseTot.cs)}** • 🪙 **${this.fmt(loseTot.gold)}** • 🔥/**🩸** **${this.fmt(loseTot.dmgOut)}**/**${this.fmt(loseTot.dmgIn)}**`;

        const winBody = winners.map(p => this.playerLine(p)).join('\n');
        const loseBody = losers.map(p => this.playerLine(p)).join('\n');

        // fields ≤ 1024 chars → chunk si besoin
        const winChunks = this.chunk1024(`${winHeader}\n\n${winBody}`);
        const loseChunks = this.chunk1024(`${loseHeader}\n\n${loseBody}`);

        const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
        winChunks.forEach((ch, i) => fields.push({ name: i === 0 ? '🏆 Vainqueurs' : '🏆 Vainqueurs (suite)', value: ch }));
        loseChunks.forEach((ch, i) => fields.push({ name: i === 0 ? '💔 Perdants' : '💔 Perdants (suite)', value: ch }));

        const color = 0x22c55e; // vert
        const embed = {
            title: `✅ Partie terminée`,
            description: `ID: \`${dto.gameId}\``,
            timestamp: new Date(dto.date).toISOString(),
            color,
            fields,
            footer: { text: 'Tengoku Tracker • GG à tous' },
        };

        return embed;
    }

    // ===== post
    async sendGameValidated(dto: GamePayload): Promise<void> {
        if (!this.webhookUrl) {
            this.logger.warn('DISCORD_GAME_WEBHOOK_URL manquant, envoi ignoré.');
            return;
        }

        const embed = this.buildSingleEmbed(dto);

        const body: any = { embeds: [embed] };
        if (this.username) body.username = this.username;
        if (this.avatarUrl) body.avatar_url = this.avatarUrl;

        const postOnce = async () => {
            const res = await fetch(this.webhookUrl!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.status === 429) {
                const j = await res.json().catch(() => ({}));
                const retry = Math.min(5, Number(j?.retry_after ?? 1));
                await new Promise(r => setTimeout(r, retry * 1000));
                return postOnce();
            }
            if (!res.ok) {
                throw new Error(`Discord webhook HTTP ${res.status}: ${await res.text().catch(() => '')}`);
            }
        };

        try {
            await postOnce();
            this.logger.log(`Webhook envoyé pour game ${dto.gameId}`);
        } catch (e) {
            this.logger.error(`Échec envoi webhook (game ${dto.gameId}) → ${e instanceof Error ? e.message : e}`);
        }
    }
}
