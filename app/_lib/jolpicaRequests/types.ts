export type JolpicaLastResultsResponse = {
  MRData: MRData;
};

export type JolpicaNextRaceResponse = {
  MRData: MRData;
};

export type MRData = {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable?: RaceTable;
  StandingsTable?: StandingsTable;
};

export type RaceTable = {
  season?: string;
  round: string | null;
  Races: Race[];
};

export type Race = {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  Results?: RaceResult[];
  SprintResults?: RaceResult[];
  FirstPractice?: Session;
  SecondPractice?: Session;
  ThirdPractice?: Session;
  Qualifying?: Session;
};

export type Circuit = {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: Location;
};

export type Location = {
  lat: string;
  long: string;
  locality: string;
  country: string;
};

export type Session = {
  date: string;
  time: string;
};

export type RaceResult = {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: RaceTime;
  FastestLap?: FastestLap;
};

export type Driver = {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
};

export type Constructor = {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
};

export type RaceTime = {
  millis?: string;
  time: string;
};

export type FastestLap = {
  rank: string;
  lap: string;
  Time: FastestLapTime;
};

export type FastestLapTime = {
  time: string;
};

export type StandingsTable = {
  season: string;
  round: string;
  StandingsLists: StandingsList[];
};

export type StandingsList = {
  season: string;
  round: string;
  DriverStandings: DriverStanding[];
};

export type DriverStanding = {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
};

export type JolpicaDriverStandingsResponse = {
  MRData: MRData;
};
