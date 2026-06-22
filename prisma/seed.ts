import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

const drivers = [
  { driverFamilyName: "Verstappen", driverId: "max_verstappen", constructorName: "Red Bull", constructorId: "red_bull" },
  { driverFamilyName: "Norris", driverId: "lando_norris", constructorName: "McLaren", constructorId: "mclaren" },
  { driverFamilyName: "Leclerc", driverId: "charles_leclerc", constructorName: "Ferrari", constructorId: "ferrari" },
  { driverFamilyName: "Piastri", driverId: "oscar_piastri", constructorName: "McLaren", constructorId: "mclaren" },
  { driverFamilyName: "Hamilton", driverId: "lewis_hamilton", constructorName: "Ferrari", constructorId: "ferrari" },
  { driverFamilyName: "Russell", driverId: "george_russell", constructorName: "Mercedes", constructorId: "mercedes" },
];

const userData = ["Alice", "Bob", "Charlie"];

const allocationDrivers = [
  { playerIdx: 0, driverIdxs: [0, 3] },
  { playerIdx: 1, driverIdxs: [1, 4] },
  { playerIdx: 2, driverIdxs: [2, 5] },
];

async function findOrCreateDriver(data: typeof drivers[number]) {
  const existing = await prisma.driver.findFirst({
    where: { driverId: data.driverId },
  });
  if (existing) return existing;
  return prisma.driver.create({ data });
}

async function main() {
  const existingGame = await prisma.sweepstakeGame.findFirst();
  if (existingGame) {
    console.log("Database already has data — skipping seed.");
    return;
  }

  const users = await Promise.all(
    userData.map((name) => prisma.user.create({ data: { name } })),
  );

  const game = await prisma.sweepstakeGame.create({
    data: {
      season: 2026,
      players: {
        create: users.map((u) => ({ userId: u.id })),
      },
    },
    include: { players: true },
  });

  console.log(
    `Seeded sweepstake game (season ${game.season}) with ${game.players.length} players:`,
  );
  for (const u of users) {
    console.log(`  - ${u.name}`);
  }

  const driverRecords = await Promise.all(drivers.map(findOrCreateDriver));

  const raceWeek = await prisma.raceWeek.create({
    data: {
      sweepstakeGameId: game.id,
      round: 1,
      circuitId: "albert_park",
      raceName: "Australian Grand Prix",
    },
  });

  for (const { playerIdx, driverIdxs } of allocationDrivers) {
    await prisma.raceWeekAllocation.create({
      data: {
        playerId: game.players[playerIdx].id,
        raceWeekId: raceWeek.id,
        drivers: {
          connect: driverIdxs.map((i) => ({ id: driverRecords[i].id })),
        },
      },
    });
  }

  console.log("Seeded Australian Grand Prix race week with driver allocations:");
  for (const { playerIdx, driverIdxs } of allocationDrivers) {
    const d1 = drivers[driverIdxs[0]].driverFamilyName;
    const d2 = drivers[driverIdxs[1]].driverFamilyName;
    console.log(`  - ${userData[playerIdx]}: ${d1} / ${d2}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
