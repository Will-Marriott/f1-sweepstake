import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SweepstakeGameWithPlayersAndRaceWeeks } from "../prismaTypes";

type DriverRecord = {
  id: number;
  driverId: string;
  driverFamilyName: string;
  constructorId: string;
  constructorName: string;
};

const { mockPrisma, mockGetDriverStandings, mockGetNextRaceInfo } = vi.hoisted(
  () => ({
    mockPrisma: {
      sweepstakeGame: {
        findMany: vi.fn(),
      },
      raceWeek: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      raceWeekAllocation: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    mockGetDriverStandings: vi.fn(),
    mockGetNextRaceInfo: vi.fn(),
  }),
);

vi.mock("../prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("./jolpicaRequests", () => ({
  getDriverStandings: mockGetDriverStandings,
  getNextRaceInfo: mockGetNextRaceInfo,
}));

import { allocateDrivers } from "./driverAllocator";

function buildDrivers(count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const position = index + 1;
    return {
      position: String(position),
      Driver: {
        driverId: `driver-${position}`,
        familyName: `Family${position}`,
      },
      Constructors: [
        {
          constructorId: `constructor-${position}`,
          name: `Constructor ${position}`,
        },
      ],
    };
  });
}

function buildStandingsResponse(round: string | null, count = 20) {
  const standingsTable =
    round === null
      ? {
          season: "2026",
          round: "",
          StandingsLists: [],
        }
      : {
          season: "2026",
          round,
          StandingsLists: [
            {
              season: "2026",
              round,
              DriverStandings: buildDrivers(count),
            },
          ],
        };

  return {
    data: {
      MRData: {
        StandingsTable: standingsTable,
      },
    },
  };
}

function buildNextRaceResponse(
  season: string,
  round: string,
  circuitId: string,
) {
  return {
    data: {
      MRData: {
        RaceTable: {
          Races: [
            {
              season,
              round,
              Circuit: {
                circuitId,
              },
            },
          ],
        },
      },
    },
  };
}

function buildGame(
  players: Array<{ id: number; hasAllocationForRound?: number }>,
  season = 2026,
): SweepstakeGameWithPlayersAndRaceWeeks {
  return {
    id: 1,
    season,
    raceWeeks: [],
    players: players.map((player) => ({
      id: player.id,
      userId: player.id + 1000,
      sweepstakeGameId: 1,
      raceWeekAllocations: player.hasAllocationForRound
        ? [
            {
              id: player.id * 10,
              playerId: player.id,
              raceWeekId: 100 + player.id,
              pointsScored: null,
              drivers: [
                {
                  id: 900 + player.id,
                  driverId: `driver-${900 + player.id}`,
                  driverFamilyName: `Family${900 + player.id}`,
                  constructorId: `constructor-${900 + player.id}`,
                  constructorName: `Constructor ${900 + player.id}`,
                },
              ],
              raceWeek: {
                id: 100 + player.id,
                sweepstakeGameId: 1,
                round: player.hasAllocationForRound,
                circuitId: "test-circuit",
                isProcessed: false,
              },
            },
          ]
        : [],
    })) as SweepstakeGameWithPlayersAndRaceWeeks["players"],
  };
}

function buildTransactionRecorder(existingDrivers: DriverRecord[] = []) {
  let nextId = 1000;
  const createdRaceWeekAllocations: Array<{
    playerId: number;
    raceWeekId: number;
    driverIds: number[];
  }> = [];

  const tx = {
    driver: {
      findFirst: vi.fn(async ({ where }: { where: { driverId: string } }) => {
        return (
          existingDrivers.find((d) => d.driverId === where.driverId) ?? null
        );
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<DriverRecord, "id">;
        }): Promise<DriverRecord> => {
          const created = { id: nextId++, ...data };
          existingDrivers.push(created);
          return created;
        },
      ),
    },
    raceWeekAllocation: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            playerId: number;
            raceWeekId: number;
            drivers: { connect: Array<{ id: number }> };
          };
        }) => {
          createdRaceWeekAllocations.push({
            playerId: data.playerId,
            raceWeekId: data.raceWeekId,
            driverIds: data.drivers.connect.map((d) => d.id),
          });
          return { id: createdRaceWeekAllocations.length, ...data };
        },
      ),
    },
  };

  mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

  return {
    tx,
    createdRaceWeekAllocations,
    existingDrivers,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, "random")
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0);
});

describe("allocateDrivers", () => {
  it("returns early when all players already have two drivers for the round", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "5", "monza"),
    );

    const allAllocatedGame = buildGame([
      { id: 1, hasAllocationForRound: 5 },
      { id: 2, hasAllocationForRound: 5 },
    ]);

    allAllocatedGame.players.forEach((player) => {
      player.raceWeekAllocations[0].drivers = [
        {
          id: 1,
          driverId: "driver-1",
          driverFamilyName: "Family1",
          constructorId: "constructor-1",
          constructorName: "Constructor 1",
        },
        {
          id: 2,
          driverId: "driver-2",
          driverFamilyName: "Family2",
          constructorId: "constructor-2",
          constructorName: "Constructor 2",
        },
      ];
    });

    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([allAllocatedGame]);

    await allocateDrivers();

    expect(mockGetDriverStandings).not.toHaveBeenCalled();
    expect(mockPrisma.raceWeek.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates race week and allocations for players missing drivers", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "3", "silverstone"),
    );
    mockGetDriverStandings.mockResolvedValue(buildStandingsResponse("2"));

    const game = buildGame([{ id: 11 }, { id: 22 }, { id: 33 }]);

    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([game]);
    mockPrisma.raceWeek.findFirst.mockResolvedValue(null);
    mockPrisma.raceWeek.create.mockResolvedValue({ id: 77 });

    const { tx, createdRaceWeekAllocations } = buildTransactionRecorder();

    await allocateDrivers();

    expect(mockGetDriverStandings).toHaveBeenCalledWith(2026, 2);
    expect(mockPrisma.raceWeek.create).toHaveBeenCalledWith({
      data: {
        sweepstakeGameId: 1,
        round: 3,
        circuitId: "silverstone",
      },
    });
    expect(createdRaceWeekAllocations).toHaveLength(3);
    expect(
      createdRaceWeekAllocations.every((a) => a.driverIds.length === 2),
    ).toBe(true);
    expect(tx.driver.create).toHaveBeenCalledTimes(6);
  });

  it("clears existing allocations when race week already exists", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "7", "spa"),
    );
    mockGetDriverStandings.mockResolvedValue(buildStandingsResponse("6"));

    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([
      buildGame([{ id: 1 }, { id: 2 }]),
    ]);

    mockPrisma.raceWeek.findFirst.mockResolvedValue({
      id: 55,
      raceWeekAllocations: [{ id: 501 }, { id: 502 }],
    });

    buildTransactionRecorder();

    await allocateDrivers();

    expect(mockPrisma.raceWeekAllocation.deleteMany).toHaveBeenCalledWith({
      where: { raceWeekId: 55 },
    });
  });

  it("reuses existing driver records and creates only missing ones", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "4", "bahrain"),
    );
    mockGetDriverStandings.mockResolvedValue(buildStandingsResponse("3"));

    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([
      buildGame([{ id: 9 }]),
    ]);
    mockPrisma.raceWeek.findFirst.mockResolvedValue(null);
    mockPrisma.raceWeek.create.mockResolvedValue({ id: 100 });

    const existingDrivers: DriverRecord[] = [
      {
        id: 999,
        driverId: "driver-1",
        driverFamilyName: "Family1",
        constructorId: "constructor-1",
        constructorName: "Constructor 1",
      },
    ];

    const { tx } = buildTransactionRecorder(existingDrivers);

    await allocateDrivers();

    expect(tx.driver.findFirst).toHaveBeenCalled();
    expect(tx.driver.create).toHaveBeenCalledTimes(1);
  });

  it("falls back to previous season standings when current standings round is missing", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "1", "albert_park"),
    );

    mockGetDriverStandings
      .mockResolvedValueOnce(buildStandingsResponse(null))
      .mockResolvedValueOnce(buildStandingsResponse("24"));

    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([
      buildGame([{ id: 1 }]),
    ]);
    mockPrisma.raceWeek.findFirst.mockResolvedValue(null);
    mockPrisma.raceWeek.create.mockResolvedValue({ id: 42 });

    buildTransactionRecorder();

    await allocateDrivers({ season: 2026, round: 1 });

    expect(mockGetDriverStandings).toHaveBeenNthCalledWith(1);
    expect(mockGetDriverStandings).toHaveBeenNthCalledWith(2, 2025);
  });

  it("throws when next race API does not return exactly one race", async () => {
    mockGetNextRaceInfo.mockResolvedValue({
      data: {
        MRData: {
          RaceTable: {
            Races: [],
          },
        },
      },
    });

    await expect(allocateDrivers()).rejects.toThrow("No next race found");
  });

  it("throws when there is not exactly one sweepstake game for the season", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "8", "hungaroring"),
    );
    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([]);

    await expect(allocateDrivers()).rejects.toThrow(
      "Expected 1 sweepstake game, but found 0.",
    );
  });

  it("throws when standings payload round is inconsistent", async () => {
    mockGetNextRaceInfo.mockResolvedValue(
      buildNextRaceResponse("2026", "10", "suzuka"),
    );

    mockGetDriverStandings.mockResolvedValue(buildStandingsResponse("1"));
    mockPrisma.sweepstakeGame.findMany.mockResolvedValue([
      buildGame([{ id: 1 }]),
    ]);

    await expect(allocateDrivers()).rejects.toThrow(
      "Unexpected driver standings data",
    );
  });
});
