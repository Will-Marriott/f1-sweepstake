import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPrisma,
  mockGetPreviousRaceResults,
  mockGetPreviousSprintResults,
  mockIsAxiosError,
} = vi.hoisted(() => ({
  mockPrisma: {
    raceWeek: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetPreviousRaceResults: vi.fn(),
  mockGetPreviousSprintResults: vi.fn(),
  mockIsAxiosError: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("./jolpicaRequests", () => ({
  getPreviousRaceResults: mockGetPreviousRaceResults,
  getPreviousSprintResults: mockGetPreviousSprintResults,
}));

vi.mock("axios", () => ({
  default: {
    isAxiosError: mockIsAxiosError,
  },
}));

import { processLastResults } from "./resultsProcessor";

type DriverFixture = {
  id: number;
  driverId: string;
  driverFamilyName: string;
  constructorId: string;
  constructorName: string;
};

function buildRaceResponse(options?: {
  season?: string;
  round?: string;
  results?: Array<{ driverId: string; points: string }>;
}) {
  const season = options?.season ?? "2026";
  const round = options?.round ?? "6";
  const results = options?.results ?? [
    { driverId: "max_verstappen", points: "25" },
    { driverId: "charles_leclerc", points: "18" },
  ];

  return {
    data: {
      MRData: {
        RaceTable: {
          season,
          round,
          Races: [
            {
              season,
              round,
              Results: results.map((result) => ({
                points: result.points,
                Driver: {
                  driverId: result.driverId,
                },
              })),
            },
          ],
        },
      },
    },
  };
}

function buildSprintResponse(options?: {
  season?: string;
  round?: string;
  sprintResults?: Array<{ driverId: string; points: string }>;
  racesCount?: number;
}) {
  const season = options?.season ?? "2026";
  const round = options?.round ?? "6";
  const sprintResults = options?.sprintResults ?? [
    { driverId: "max_verstappen", points: "8" },
    { driverId: "charles_leclerc", points: "7" },
  ];

  const racesCount = options?.racesCount ?? 1;

  return {
    data: {
      MRData: {
        RaceTable: {
          season,
          round,
          Races:
            racesCount === 1
              ? [
                  {
                    season,
                    round,
                    SprintResults: sprintResults.map((result) => ({
                      points: result.points,
                      Driver: {
                        driverId: result.driverId,
                      },
                    })),
                  },
                ]
              : [],
        },
      },
    },
  };
}

function buildRaceWeeks() {
  const driverA: DriverFixture = {
    id: 1,
    driverId: "max_verstappen",
    driverFamilyName: "Verstappen",
    constructorId: "red_bull",
    constructorName: "Red Bull",
  };

  const driverB: DriverFixture = {
    id: 2,
    driverId: "charles_leclerc",
    driverFamilyName: "Leclerc",
    constructorId: "ferrari",
    constructorName: "Ferrari",
  };

  const driverC: DriverFixture = {
    id: 3,
    driverId: "lando_norris",
    driverFamilyName: "Norris",
    constructorId: "mclaren",
    constructorName: "McLaren",
  };

  return [
    {
      id: 101,
      sweepstakeGameId: 10,
      round: 6,
      circuitId: "catalunya",
      isProcessed: true,
      raceWeekAllocations: [
        {
          id: 5001,
          playerId: 1,
          raceWeekId: 101,
          pointsScored: null,
          drivers: [driverA, driverB],
        },
      ],
    },
    {
      id: 102,
      sweepstakeGameId: 11,
      round: 6,
      circuitId: "catalunya",
      isProcessed: false,
      raceWeekAllocations: [
        {
          id: 5002,
          playerId: 2,
          raceWeekId: 102,
          pointsScored: null,
          drivers: [driverC],
        },
      ],
    },
  ];
}

function setupTransactionRecorder() {
  const tx = {
    raceWeekAllocation: {
      update: vi.fn(),
    },
  };

  mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

  return { tx };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAxiosError.mockReturnValue(false);
});

describe("processLastResults", () => {
  it("recalculates points for all allocations in matching season+round race weeks", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(buildRaceResponse());
    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());
    mockPrisma.raceWeek.findMany.mockResolvedValue(buildRaceWeeks());

    const { tx } = setupTransactionRecorder();

    const result = await processLastResults();

    expect(mockPrisma.raceWeek.findMany).toHaveBeenCalledWith({
      where: {
        round: 6,
        sweepstakeGame: {
          is: {
            season: 2026,
          },
        },
      },
      include: { raceWeekAllocations: { include: { drivers: true } } },
    });

    expect(tx.raceWeekAllocation.update).toHaveBeenCalledTimes(2);
    expect(tx.raceWeekAllocation.update).toHaveBeenNthCalledWith(1, {
      where: { id: 5001 },
      data: { pointsScored: 58 },
    });
    expect(tx.raceWeekAllocation.update).toHaveBeenNthCalledWith(2, {
      where: { id: 5002 },
      data: { pointsScored: 0 },
    });

    expect(result).toEqual({
      season: 2026,
      round: 6,
      processedRaceWeeks: 2,
      updatedAllocations: 2,
      message: "Successfully processed race results.",
    });
  });

  it("continues when sprint endpoint returns 404", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(buildRaceResponse());
    mockGetPreviousSprintResults.mockRejectedValue({
      response: { status: 404 },
    });
    mockIsAxiosError.mockReturnValue(true);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    mockPrisma.raceWeek.findMany.mockResolvedValue(buildRaceWeeks());
    const { tx } = setupTransactionRecorder();

    await processLastResults();

    expect(logSpy).toHaveBeenCalledWith(
      "No sprint results found for the last race.",
    );
    expect(tx.raceWeekAllocation.update).toHaveBeenNthCalledWith(1, {
      where: { id: 5001 },
      data: { pointsScored: 43 },
    });

    logSpy.mockRestore();
  });

  it("returns a no-op summary when no race weeks exist for season+round", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(buildRaceResponse());
    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());
    mockPrisma.raceWeek.findMany.mockResolvedValue([]);

    const result = await processLastResults();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      season: 2026,
      round: 6,
      processedRaceWeeks: 0,
      updatedAllocations: 0,
      message: "No race weeks found for this season and round.",
    });
  });

  it("throws when race table has no races", async () => {
    mockGetPreviousRaceResults.mockResolvedValue({
      data: {
        MRData: {
          RaceTable: {
            season: "2026",
            round: "6",
            Races: [],
          },
        },
      },
    });

    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());

    await expect(processLastResults()).rejects.toThrow("No last race found");
  });

  it("throws when race results are empty", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(
      buildRaceResponse({ results: [] }),
    );
    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());

    await expect(processLastResults()).rejects.toThrow(
      "No results found in the response data.",
    );
  });

  it("throws when season is missing", async () => {
    mockGetPreviousRaceResults.mockResolvedValue({
      data: {
        MRData: {
          RaceTable: {
            round: "6",
            Races: [
              {
                season: "2026",
                round: "6",
                Results: [
                  {
                    points: "25",
                    Driver: {
                      driverId: "max_verstappen",
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });
    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());

    await expect(processLastResults()).rejects.toThrow(
      "Season information is missing in the response data.",
    );
  });

  it("throws when round is invalid", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(
      buildRaceResponse({ round: "not-a-number" }),
    );
    mockGetPreviousSprintResults.mockResolvedValue(buildSprintResponse());

    await expect(processLastResults()).rejects.toThrow(
      "Invalid round information in the response data.",
    );
  });

  it("propagates sprint fetch errors when not a 404", async () => {
    mockGetPreviousRaceResults.mockResolvedValue(buildRaceResponse());
    mockGetPreviousSprintResults.mockRejectedValue(new Error("timeout"));
    mockIsAxiosError.mockReturnValue(false);

    await expect(processLastResults()).rejects.toThrow("timeout");
  });

  it("treats malformed sprint payload as no sprint and still processes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    mockGetPreviousRaceResults.mockResolvedValue(buildRaceResponse());
    mockGetPreviousSprintResults.mockResolvedValue(
      buildSprintResponse({ racesCount: 0 }),
    );
    mockPrisma.raceWeek.findMany.mockResolvedValue(buildRaceWeeks());

    const { tx } = setupTransactionRecorder();

    await processLastResults();

    expect(logSpy).toHaveBeenCalledWith("No sprint results found");
    expect(tx.raceWeekAllocation.update).toHaveBeenNthCalledWith(1, {
      where: { id: 5001 },
      data: { pointsScored: 43 },
    });

    logSpy.mockRestore();
  });
});
