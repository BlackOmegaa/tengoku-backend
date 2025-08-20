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
        healOnTeammates: number;
        shieldOnTeammates: number;
        ccScore: number;
        wasAfk: number;
        physicalDamageTaken: number;
        multiKill: number;
        killingSpree: number;
    }>;
};

@Injectable()
export class DiscordWebhookService {
    private readonly logger = new Logger(DiscordWebhookService.name);
    private readonly webhookUrl = process.env.DISCORD_GAME_WEBHOOK_URL;

    private fmt(n: number | undefined | null) {
        if (n == null || Number.isNaN(n)) return '0';
        return n.toLocaleString('fr-FR');
    }
    private kdaRatio(k: number, d: number, a: number) {
        const denom = Math.max(1, d);
        return ((k + a) / denom).toFixed(2);
    }
    private chunk(s: string, size = 1024) {
        const out: string[] = [];
        for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
        return out;
    }
    private sum(arr: number[]) {
        return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    }

    private buildEmbeds(dto: GamePayload) {
        const winners = dto.players.filter(p => p.isWinner);
        const losers = dto.players.filter(p => !p.isWinner);

        const sumStats = (team: GamePayload['players']) => {
            const kills = this.sum(team.map(p => p.kills));
            const deaths = this.sum(team.map(p => p.deaths));
            const assists = this.sum(team.map(p => p.assists));
            const cs = this.sum(team.map(p => p.cs));
            const gold = this.sum(team.map(p => p.gold));
            const dmgOut = this.sum(team.map(p => p.damageDealt));
            const dmgIn = this.sum(team.map(p => p.damageTaken));
            const tp = this.sum(team.map(p => p.tpChange));
            const heal = this.sum(team.map(p => p.healOnTeammates));
            const shield = this.sum(team.map(p => p.shieldOnTeammates));
            const cc = this.sum(team.map(p => p.ccScore));
            const afk = this.sum(team.map(p => p.wasAfk));
            const physIn = this.sum(team.map(p => p.physicalDamageTaken));
            const multi = this.sum(team.map(p => p.multiKill));
            const spree = this.sum(team.map(p => p.killingSpree));
            return { kills, deaths, assists, cs, gold, dmgOut, dmgIn, tp, heal, shield, cc, afk, physIn, multi, spree };
        };

        const w = sumStats(winners);
        const l = sumStats(losers);

        const teamLine = (label: string, s: ReturnType<typeof sumStats>) => {
            const kdaR = this.kdaRatio(s.kills, s.deaths, s.assists);
            return [
                `**${label}**`,
                `— **K/D/A** ${this.fmt(s.kills)}/${this.fmt(s.deaths)}/${this.fmt(s.assists)} (KDA ${kdaR})`,
                `— **CS** ${this.fmt(s.cs)}`,
                `— **Gold** ${this.fmt(s.gold)}`,
                `— **Dmg** ${this.fmt(s.dmgOut)}/${this.fmt(s.dmgIn)}`,
                `— **TP** ${s.tp >= 0 ? '+' : ''}${this.fmt(s.tp)}`,
                `— **Heal/Shield** ${this.fmt(s.heal)}/${this.fmt(s.shield)}`,
                `— **CC** ${this.fmt(s.cc)}`,
                s.afk ? `— **AFK** ${this.fmt(s.afk)}s` : '',
                s.physIn ? `— **PhysIn** ${this.fmt(s.physIn)}` : '',
                s.multi ? `— **xMulti** ${this.fmt(s.multi)}` : '',
                s.spree ? `— **xSpree** ${this.fmt(s.spree)}` : '',
            ].filter(Boolean).join(' ');
        };

        const fmtPlayer = (p: GamePayload['players'][number]) => {
            const name = `${p.gameName}#${p.tagLine}`;
            const kdaR = this.kdaRatio(p.kills, p.deaths, p.assists);
            return [
                `• **${name}** (${p.champion}, L${p.level})`,
                `— **${p.kills}/${p.deaths}/${p.assists}** (KDA ${kdaR})`,
                `— **CS** ${this.fmt(p.cs)} — **Gold** ${this.fmt(p.gold)}`,
                `— **Dmg** ${this.fmt(p.damageDealt)}/${this.fmt(p.damageTaken)}`,
                `— **TP** ${p.tpChange >= 0 ? '+' : ''}${p.tpChange}`,
                `— **Heal/Shield** ${this.fmt(p.healOnTeammates)}/${this.fmt(p.shieldOnTeammates)}`,
                `— **CC** ${this.fmt(p.ccScore)}`,
                p.wasAfk ? `— **AFK** ${this.fmt(p.wasAfk)}s` : '',
                p.physicalDamageTaken ? `— **PhysIn** ${this.fmt(p.physicalDamageTaken)}` : '',
                p.multiKill ? `— **xMulti** ${this.fmt(p.multiKill)}` : '',
                p.killingSpree ? `— **xSpree** ${this.fmt(p.killingSpree)}` : '',
            ].filter(Boolean).join(' ');
        };

        const wLines = winners.map(fmtPlayer).join('\n');
        const lLines = losers.map(fmtPlayer).join('\n');

        const base = {
            title: `✅ Game validée — ID ${dto.gameId}`,
            description: `**Vainqueurs :** ${winners.length} • **Perdants :** ${losers.length}`,
            timestamp: new Date(dto.date).toISOString(),
            color: 0x3fb950,
            fields: [
                { name: 'Résumé Vainqueurs', value: teamLine('Winners', w).slice(0, 1024) },
                { name: 'Résumé Perdants', value: teamLine('Losers', l).slice(0, 1024) },
            ],
        };

        const embeds: any[] = [base];

        const wChunks = this.chunk(wLines);
        if (wChunks.length) {
            embeds.push({
                title: 'Détail joueurs — Vainqueurs',
                color: 0x238636,
                fields: wChunks.map((c, i) => ({ name: i === 0 ? 'Vainqueurs' : `Vainqueurs (suite ${i})`, value: c || '—' })),
            });
        }
        const lChunks = this.chunk(lLines);
        if (lChunks.length) {
            embeds.push({
                title: 'Détail joueurs — Perdants',
                color: 0xda3633,
                fields: lChunks.map((c, i) => ({ name: i === 0 ? 'Perdants' : `Perdants (suite ${i})`, value: c || '—' })),
            });
        }

        // garde max 10 embeds (limite Discord)
        return embeds.slice(0, 10);
    }

    async sendGameValidated(dto: GamePayload): Promise<void> {
        if (!this.webhookUrl) {
            this.logger.warn('DISCORD_GAME_WEBHOOK_URL manquant, envoi ignoré.');
            return;
        }

        const embeds = this.buildEmbeds(dto);

        // simple retry 429
        const doPost = async () => {
            const res = await fetch(this.webhookUrl!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds }),
            });
            if (res.status === 429) {
                const body = await res.json().catch(() => ({}));
                const retryAfter = Math.min(5, Number(body?.retry_after ?? 1));
                this.logger.warn(`Discord rate-limited. Retry in ${retryAfter}s`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                return doPost();
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Discord webhook HTTP ${res.status}: ${text}`);
            }
        };

        try {
            await doPost();
            this.logger.log(`Webhook envoyé pour game ${dto.gameId}`);
        } catch (e) {
            this.logger.error(`Échec envoi webhook (game ${dto.gameId}) → ${e instanceof Error ? e.message : e}`);
        }
    }
}
