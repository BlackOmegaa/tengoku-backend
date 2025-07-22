/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - Added the required column `gameName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profileIconId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summonerLevel` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tagLine` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "puuid" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "displayName" TEXT,
    "summonerLevel" INTEGER NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "tp" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Bronze',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id", "puuid", "rank", "tp") SELECT "id", "puuid", "rank", "tp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_puuid_key" ON "User"("puuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
