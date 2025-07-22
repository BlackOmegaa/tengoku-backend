-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerInGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "cs" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "damageTaken" INTEGER NOT NULL,
    "tpChange" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerInGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerInGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlayerInGame" ("assists", "champion", "cs", "damageDealt", "damageTaken", "deaths", "gameId", "gold", "id", "isWinner", "kills", "userId") SELECT "assists", "champion", "cs", "damageDealt", "damageTaken", "deaths", "gameId", "gold", "id", "isWinner", "kills", "userId" FROM "PlayerInGame";
DROP TABLE "PlayerInGame";
ALTER TABLE "new_PlayerInGame" RENAME TO "PlayerInGame";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
