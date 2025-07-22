-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puuid" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "summonerLevel" INTEGER NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tp" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("gameName", "id", "profileIconId", "puuid", "summonerLevel", "tagLine") SELECT "gameName", "id", "profileIconId", "puuid", "summonerLevel", "tagLine" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_puuid_key" ON "User"("puuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
