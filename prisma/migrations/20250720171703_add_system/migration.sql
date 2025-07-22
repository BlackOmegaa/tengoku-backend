/*
  Warnings:

  - You are about to drop the column `date` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `gold` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `kda` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `tpChange` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Game` table. All the data in the column will be lost.
  - Added the required column `winningTeamId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "GameParticipant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "puuid" TEXT NOT NULL,
    "riotIdGameName" TEXT NOT NULL,
    "riotIdTagLine" TEXT NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "cs" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "damageTaken" INTEGER NOT NULL,
    "tpChange" INTEGER NOT NULL,
    CONSTRAINT "GameParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winningTeamId" INTEGER NOT NULL,
    "isRanked" BOOLEAN NOT NULL DEFAULT true,
    "accepted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Game" ("accepted", "id", "isRanked") SELECT "accepted", "id", "isRanked" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
