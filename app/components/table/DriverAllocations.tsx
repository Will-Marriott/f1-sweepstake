import { prisma } from "@/app/_lib/prisma/prisma";
import DriverAllocationsPanel from "./DriverAllocationsPanel";

async function DriverAllocations() {
  const raceWeeks = await prisma.raceWeek.findMany({
    include: {
      raceWeekAllocations: {
        include: { drivers: true, player: { include: { user: true } } },
      },
    },
    orderBy: { round: "desc" },
  });

  const weeksData = raceWeeks.map((raceWeek) => ({
    subtitle: `Round ${raceWeek.round}${raceWeek.raceName ? ` - ${raceWeek.raceName}` : ""}`,
    hasPoints: raceWeek.raceWeekAllocations.some(
      (a) => a.pointsScored != null,
    ),
    allocations: raceWeek.raceWeekAllocations
      .map((a) => ({
        playerName: a.player.user.name,
        driver1: a.drivers[0]?.driverFamilyName ?? "N/A",
        driver2: a.drivers[1]?.driverFamilyName ?? "N/A",
        points: a.pointsScored != null ? String(a.pointsScored) : "—",
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName)),
  }));

  return <DriverAllocationsPanel weeksData={weeksData} />;
}

export default DriverAllocations;
