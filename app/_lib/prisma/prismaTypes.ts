import type { Prisma } from "../../generated/prisma/browser";

export type RaceWeekAllocationWithDrivers =
  Prisma.RaceWeekAllocationGetPayload<{ include: { drivers: true } }>;

export type SweepstakeGameWithPlayersAndRaceWeeks =
  Prisma.SweepstakeGameGetPayload<{
    include: {
      players: {
        include: {
          raceWeekAllocations: {
            include: { raceWeek: true; drivers: true };
          };
        };
      };
      raceWeeks: true;
    };
  }>;
