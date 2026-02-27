export const placeholderData = {};

interface Leaderboard {
  player: string;
  points: number;
}

export const leaderboard: Leaderboard[] = [
  { player: "Will", points: 10 },
  {
    player: "Alex",
    points: 5,
  },
  { player: "Will", points: 10 },
  {
    player: "Alex",
    points: 5,
  },
  { player: "Will", points: 10 },
  {
    player: "Alex",
    points: 5,
  },
  { player: "Will", points: 10 },
  {
    player: "Alex",
    points: 5,
  },
  { player: "Will", points: 10 },
  {
    player: "Alex",
    points: 5,
  },
];

export async function getAsyncLeaderboard(): Promise<Leaderboard[]> {
  try {
    console.log("Fetching leaderboard data...");
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    console.log("async fetch complete");
    return leaderboard;
  } catch {
    return [];
  }
}
