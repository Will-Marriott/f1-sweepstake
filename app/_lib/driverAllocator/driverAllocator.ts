import { prisma } from "../prisma/prisma";
import { SweepstakeGameWithPlayersAndRaceWeeks } from "../prisma/prismaTypes";
import {
  getDriverStandings,
  getNextRaceInfo,
} from "../jolpicaRequests/jolpicaRequests";

export type AllocateDriversOptions = {
  season?: number;
  round?: number;
};

export const allocateDrivers = async (options?: AllocateDriversOptions) => {
  const nextRace = await getNextRace(options?.season, options?.round);

  const sweepstakeGame = await getSweepstakeGame(nextRace.season);

  const isAnyPlayerMissingDrivers = sweepstakeGame.players.some((player) => {
    const allocation = player.raceWeekAllocations.find(
      (rwa) => rwa.raceWeek.round === nextRace.round,
    );
    return !allocation || allocation.drivers.length !== 2;
  });

  if (!isAnyPlayerMissingDrivers) {
    console.log(
      "All players for this sweepstake game and round have 2 allocated drivers. No further action required.",
    );
    return;
  }

  const driversWithStandings = await getDriversWithStandings(
    nextRace.round,
    nextRace.season,
  );

  const top10Drivers = driversWithStandings.slice(0, 10);
  const second10Drivers = driversWithStandings.slice(10, 20);

  const raceWeek = await findOrCreateRaceWeek(
    sweepstakeGame.id,
    nextRace.round,
    nextRace.circuitId,
  );

  const playerAllocations = assignDriversToPlayers(
    sweepstakeGame.players,
    top10Drivers,
    second10Drivers,
  );

  await saveAllocations(raceWeek.id, playerAllocations);

  console.log(
    `Successfully allocated drivers for round ${nextRace.round} to ${playerAllocations.length} players.`,
  );
};

const findOrCreateRaceWeek = async (
  sweepstakeGameId: number,
  round: number,
  circuitId: string,
) => {
  const existingRaceWeek = await prisma.raceWeek.findFirst({
    where: { sweepstakeGameId, round },
    include: { raceWeekAllocations: true },
  });

  if (existingRaceWeek) {
    if (existingRaceWeek.raceWeekAllocations.length > 0) {
      await prisma.raceWeekAllocation.deleteMany({
        where: { raceWeekId: existingRaceWeek.id },
      });
      console.log(
        `Cleared ${existingRaceWeek.raceWeekAllocations.length} existing allocations for round ${round}.`,
      );
    }
    return existingRaceWeek;
  }

  return prisma.raceWeek.create({
    data: {
      sweepstakeGameId,
      round,
      circuitId,
    },
  });
};

type DriverInfo = {
  driverId: string;
  position: number;
  driverFamilyName: string;
  constructorId: string;
  constructorName: string;
};

type PlayerAllocation = {
  playerId: number;
  drivers: DriverInfo[];
};

const pickRandomDriver = (
  pool: DriverInfo[],
  fullPool: DriverInfo[],
): DriverInfo => {
  if (pool.length === 0) {
    pool.push(...fullPool);
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool.splice(index, 1)[0];
};

const assignDriversToPlayers = (
  players: SweepstakeGameWithPlayersAndRaceWeeks["players"],
  top10Drivers: DriverInfo[],
  second10Drivers: DriverInfo[],
): PlayerAllocation[] => {
  const top10Remaining = [...top10Drivers];
  const second10Remaining = [...second10Drivers];

  return players.map((player) => {
    const topDriver = pickRandomDriver(top10Remaining, top10Drivers);
    const bottomDriver = pickRandomDriver(second10Remaining, second10Drivers);

    return {
      playerId: player.id,
      drivers: [topDriver, bottomDriver],
    };
  });
};

const findOrCreateDriver = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  driver: DriverInfo,
) => {
  const existingDriver = await tx.driver.findFirst({
    where: { driverId: driver.driverId },
  });

  if (existingDriver) {
    return existingDriver;
  }

  return tx.driver.create({
    data: {
      driverId: driver.driverId,
      driverFamilyName: driver.driverFamilyName,
      constructorId: driver.constructorId,
      constructorName: driver.constructorName,
    },
  });
};

const saveAllocations = async (
  raceWeekId: number,
  playerAllocations: PlayerAllocation[],
) => {
  await prisma.$transaction(async (tx) => {
    for (const allocation of playerAllocations) {
      const driverRecords = await Promise.all(
        allocation.drivers.map((d) => findOrCreateDriver(tx, d)),
      );

      await tx.raceWeekAllocation.create({
        data: {
          playerId: allocation.playerId,
          raceWeekId,
          drivers: {
            connect: driverRecords.map((d) => ({ id: d.id })),
          },
        },
      });
    }
  });
};

const getSweepstakeGame = async (
  season: number,
): Promise<SweepstakeGameWithPlayersAndRaceWeeks> => {
  const sweepstakeGames = await prisma.sweepstakeGame.findMany({
    where: {
      season: season,
    },
    include: {
      raceWeeks: true,
      players: {
        include: {
          raceWeekAllocations: {
            include: { raceWeek: true, drivers: true },
          },
        },
      },
    },
  });

  if (sweepstakeGames.length !== 1) {
    throw new Error(
      `Expected 1 sweepstake game, but found ${sweepstakeGames.length}.`,
    );
  }

  return sweepstakeGames[0];
};

const getDriversWithStandings = async (round: number, season: number) => {
  const currentDriverStandingsResponse =
    round > 1
      ? await getDriverStandings(season, round - 1)
      : await getDriverStandings();

  let standingsTable =
    currentDriverStandingsResponse.data.MRData.StandingsTable;

  if (!standingsTable?.round) {
    const lastSeasonStandings = await getDriverStandings(season - 1);
    standingsTable = lastSeasonStandings.data.MRData.StandingsTable;
  }

  const standingsRound = parseInt(standingsTable!.round);
  const isValidStandings =
    standingsTable?.StandingsLists.length === 1 &&
    (standingsRound === round - 1 || (round === 1 && standingsRound > 0));

  if (isValidStandings) {
    return standingsTable!.StandingsLists[0].DriverStandings.map((driver) => {
      const driverId = driver.Driver.driverId;
      const position = parseInt(driver.position) || 0;
      const driverFamilyName = driver.Driver.familyName;
      const constructorId = driver.Constructors[0]?.constructorId ?? "unknown";
      const constructorName = driver.Constructors[0]?.name ?? "Unknown";
      return {
        driverId,
        position,
        driverFamilyName,
        constructorId,
        constructorName,
      };
    });
  } else {
    throw new Error(
      "Unexpected driver standings data: " + JSON.stringify(standingsTable),
    );
  }
};

const getNextRace = async (overrideSeason?: number, overrideRound?: number) => {
  const nextRaceInfoResponse = await getNextRaceInfo(
    overrideSeason,
    overrideRound,
  );
  const nextRaceInfo = nextRaceInfoResponse.data;

  if (nextRaceInfo.MRData.RaceTable?.Races.length !== 1) {
    throw new Error("No next race found");
  }

  const nextRace = nextRaceInfo.MRData.RaceTable.Races[0];

  const season = parseInt(nextRace.season);
  const round = parseInt(nextRace.round);
  const circuitId = nextRace.Circuit.circuitId;

  if (isNaN(season)) {
    throw new Error("Invalid season information in the next race data.");
  }

  if (isNaN(round)) {
    throw new Error("Invalid round information in the next race data.");
  }

  return { season, round, circuitId };
};
