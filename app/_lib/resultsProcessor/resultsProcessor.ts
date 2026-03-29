import type { RaceWeekAllocationWithDrivers } from "../prisma/prismaTypes";
import { prisma } from "../prisma/prisma";
import axios from "axios";
import {
  getPreviousRaceResults,
  getPreviousSprintResults,
} from "../jolpicaRequests/jolpicaRequests";
import { JolpicaLastResultsResponse } from "../jolpicaRequests/types";
import { sendDiscordNotification } from "../discordNotifier/discordNotifier";

export const processLastResults = async () => {
  const previousRaceResultsResponse = await getPreviousRaceResults();
  const previousRaceResults = previousRaceResultsResponse.data;

  let sprintPoints = new Map<string, number>();
  try {
    const previousSprintResultsResponse = await getPreviousSprintResults();
    const previousSprintResults = previousSprintResultsResponse.data;
    sprintPoints = getSprintPoints(previousSprintResults);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
    console.log("No sprint results found for the last race.");
  }

  const racePoints = getRacePoints(previousRaceResults);

  const raceInfo = {
    season: getSeason(previousRaceResults),
    round: getRound(previousRaceResults),
    points: getCombinedPoints(racePoints, sprintPoints),
  };

  const raceWeeksForRound = await getRaceWeeksForRound(
    raceInfo.season,
    raceInfo.round,
  );
  if (raceWeeksForRound.length === 0) {
    return {
      season: raceInfo.season,
      round: raceInfo.round,
      processedRaceWeeks: 0,
      updatedAllocations: 0,
      message: "No race weeks found for this season and round.",
    };
  }

  const unprocessedRaceWeeks = raceWeeksForRound.filter(
    (raceWeek) => !raceWeek.isProcessed,
  );
  if (unprocessedRaceWeeks.length === 0) {
    return {
      season: raceInfo.season,
      round: raceInfo.round,
      processedRaceWeeks: 0,
      updatedAllocations: 0,
      message: "All race weeks for this round have already been processed.",
    };
  }

  const driverAllocations = unprocessedRaceWeeks.flatMap(
    (raceWeek) => raceWeek.raceWeekAllocations,
  );

  const allocationsWithPointsAdded = updateAllocationsWithPoints(
    driverAllocations,
    raceInfo.points,
  );

  await prisma.$transaction(async (tx) => {
    for (const allocation of allocationsWithPointsAdded) {
      await tx.raceWeekAllocation.update({
        where: { id: allocation.id },
        data: { pointsScored: allocation.pointsScored },
      });
    }
    for (const raceWeek of unprocessedRaceWeeks) {
      await tx.raceWeek.update({
        where: { id: raceWeek.id },
        data: { isProcessed: true },
      });
    }
  });

  await sendDiscordNotification(
    `Race results processed for season ${raceInfo.season}, round ${raceInfo.round}.`,
  );

  return {
    season: raceInfo.season,
    round: raceInfo.round,
    processedRaceWeeks: unprocessedRaceWeeks.length,
    updatedAllocations: allocationsWithPointsAdded.length,
    message: "Successfully processed race results.",
  };
};

const getRaceWeeksForRound = async (season: number, round: number) => {
  return prisma.raceWeek.findMany({
    where: {
      round,
      sweepstakeGame: {
        is: {
          season,
        },
      },
    },
    include: { raceWeekAllocations: { include: { drivers: true } } },
  });
};

type AllocationWithPoints = {
  id: number;
  pointsScored: number;
};

const updateAllocationsWithPoints = (
  allocations: RaceWeekAllocationWithDrivers[],
  results: Map<string, number>,
): AllocationWithPoints[] => {
  return allocations.map((allocation) => {
    return {
      id: allocation.id,
      pointsScored: allocation.drivers.reduce((totalPoints, driver) => {
        const points = results.get(driver.driverId) ?? 0;
        return totalPoints + points;
      }, 0),
    };
  });
};

const isNotFoundError = (error: unknown) => {
  return axios.isAxiosError(error) && error.response?.status === 404;
};

const getSeason = (responseData: JolpicaLastResultsResponse) => {
  if (!responseData.MRData.RaceTable?.season) {
    throw new Error("Season information is missing in the response data.");
  }

  const season = parseInt(responseData.MRData.RaceTable.season);
  if (isNaN(season)) {
    throw new Error("Invalid season information in the response data.");
  }

  return season;
};

const getRound = (responseData: JolpicaLastResultsResponse) => {
  if (!responseData.MRData.RaceTable?.round) {
    throw new Error("Round information is missing in the response data.");
  }

  const round = parseInt(responseData.MRData.RaceTable.round);
  if (isNaN(round)) {
    throw new Error("Invalid round information in the response data.");
  }

  return round;
};

const getRacePoints = (results: JolpicaLastResultsResponse) => {
  const resultsMap = new Map<string, number>();
  const races = results.MRData.RaceTable?.Races;
  if (!races || races?.length !== 1) {
    throw new Error("No last race found");
  }
  const race = races[0];
  race.Results?.forEach((result) => {
    const points = parseInt(result.points);
    if (!isNaN(points)) {
      resultsMap.set(result.Driver.driverId, points);
    }
  });

  if (resultsMap.size === 0) {
    throw new Error("No results found in the response data.");
  }
  return resultsMap;
};

const getSprintPoints = (results: JolpicaLastResultsResponse) => {
  const resultsMap = new Map<string, number>();
  const races = results.MRData.RaceTable?.Races;
  if (!races || races?.length !== 1) {
    console.log("No sprint results found");
    return resultsMap;
  }
  const race = races[0];
  race.SprintResults?.forEach((result) => {
    const points = parseInt(result.points);
    if (!isNaN(points)) {
      resultsMap.set(result.Driver.driverId, points);
    }
  });

  return resultsMap;
};

const getCombinedPoints = (
  raceResults: Map<string, number>,
  sprintResults: Map<string, number>,
) => {
  const combinedResults = new Map<string, number>();

  const drivers = Array.from(
    new Set([...raceResults.keys(), ...sprintResults.keys()]),
  );

  drivers.forEach((driver) => {
    combinedResults.set(
      driver,
      (raceResults.get(driver) ?? 0) + (sprintResults.get(driver) ?? 0),
    );
  });
  return combinedResults;
};
