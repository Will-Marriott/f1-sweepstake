-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RaceWeek" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sweepstakeGameId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "circuitId" TEXT NOT NULL,
    "raceName" TEXT NOT NULL DEFAULT '',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RaceWeek_sweepstakeGameId_fkey" FOREIGN KEY ("sweepstakeGameId") REFERENCES "SweepstakeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RaceWeek" ("circuitId", "id", "isProcessed", "round", "sweepstakeGameId") SELECT "circuitId", "id", "isProcessed", "round", "sweepstakeGameId" FROM "RaceWeek";
DROP TABLE "RaceWeek";
ALTER TABLE "new_RaceWeek" RENAME TO "RaceWeek";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
