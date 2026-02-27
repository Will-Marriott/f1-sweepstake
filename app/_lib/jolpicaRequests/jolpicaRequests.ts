import axios from "axios";
import {
  JolpicaDriverStandingsResponse,
  JolpicaLastResultsResponse,
  JolpicaNextRaceResponse,
} from "./types";

export const getNextRaceInfo = async (season?: number, round?: number) => {
  const path =
    season && round
      ? `https://api.jolpi.ca/ergast/f1/${season}/${round}/races/`
      : "https://api.jolpi.ca/ergast/f1/current/next/races/";

  try {
    return await axios.get<JolpicaNextRaceResponse>(path);
  } catch (error) {
    throw new Error("Error fetching next race info: " + error);
  }
};

export const getPreviousRaceResults = async () => {
  try {
    return await axios.get<JolpicaLastResultsResponse>(
      "https://api.jolpi.ca/ergast/f1/current/last/results/",
    );
  } catch (error) {
    throw new Error("Error fetching previous race results: " + error);
  }
};

export const getPreviousSprintResults = async () => {
  try {
    return await axios.get<JolpicaLastResultsResponse>(
      "https://api.jolpi.ca/ergast/f1/current/last/sprint/",
    );
  } catch (error) {
    throw new Error("Error fetching previous sprint results: " + error);
  }
};

export const getDriverStandings = async (season?: number, round?: number) => {
  const seasonPart = season ?? "current";
  const roundPart = round ? `/${round}` : "";

  try {
    return await axios.get<JolpicaDriverStandingsResponse>(
      `https://api.jolpi.ca/ergast/f1/${seasonPart}${roundPart}/driverStandings/`,
    );
  } catch (error) {
    throw new Error("Error fetching driver standings: " + error);
  }
};
