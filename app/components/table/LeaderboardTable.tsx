import { prisma } from "@/app/_lib/prisma/prisma";
import Table from "./Table";

async function LeaderboardTable() {
  const players = await prisma.player.findMany({
    include: { raceWeekAllocations: true, user: true },
  });

  const leaderboardData = players
    .map((player) => {
      const totalPoints = player.raceWeekAllocations.reduce(
        (acc, allocation) => acc + (allocation.pointsScored ?? 0),
        0,
      );
      return { playerName: player.user.name, points: totalPoints };
    })
    .sort((a, b) => b.points - a.points);

  return (
    <Table
      title="Leaderboard"
      tableData={leaderboardData}
      columns={[
        { key: "playerName", label: "Player" },
        { key: "points", label: "Points" },
      ]}
    />
  );
}

export default LeaderboardTable;
