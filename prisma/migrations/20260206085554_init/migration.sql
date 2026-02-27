-- CreateTable
CREATE TABLE "SweepstakeGame" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "season" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "sweepstakeGameId" INTEGER NOT NULL,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_sweepstakeGameId_fkey" FOREIGN KEY ("sweepstakeGameId") REFERENCES "SweepstakeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceWeek" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sweepstakeGameId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "circuitId" TEXT NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RaceWeek_sweepstakeGameId_fkey" FOREIGN KEY ("sweepstakeGameId") REFERENCES "SweepstakeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceWeekAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "raceWeekId" INTEGER NOT NULL,
    CONSTRAINT "RaceWeekAllocation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RaceWeekAllocation_raceWeekId_fkey" FOREIGN KEY ("raceWeekId") REFERENCES "RaceWeek" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "driverName" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "constructorName" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DriverToRaceWeekAllocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_DriverToRaceWeekAllocation_A_fkey" FOREIGN KEY ("A") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DriverToRaceWeekAllocation_B_fkey" FOREIGN KEY ("B") REFERENCES "RaceWeekAllocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_DriverToRaceWeekAllocation_AB_unique" ON "_DriverToRaceWeekAllocation"("A", "B");

-- CreateIndex
CREATE INDEX "_DriverToRaceWeekAllocation_B_index" ON "_DriverToRaceWeekAllocation"("B");
