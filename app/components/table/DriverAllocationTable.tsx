import { prisma } from "@/app/_lib/prisma/prisma";
import Table from "./Table";

async function DriverAllocationTable() {
  const raceWeek = await prisma.raceWeek.findFirst({
    include: {
      raceWeekAllocations: {
        include: { drivers: true, player: { include: { user: true } } },
      },
    },
  });

  const allocationTableData = raceWeek?.raceWeekAllocations
    .map((allocation) => {
      return {
        playerName: allocation.player.user.name,
        driver1: allocation.drivers[0]?.driverFamilyName || "N/A",
        driver2: allocation.drivers[1]?.driverFamilyName || "N/A",
      };
    })
    .sort((a, b) => a.playerName!.localeCompare(b.playerName!));

  return (
    <Table
      tableData={allocationTableData || []}
      columns={[
        { key: "playerName", label: "Player" },
        { key: "driver1", label: "Driver 1" },
        { key: "driver2", label: "Driver 2" },
      ]}
    />
  );
}

export default DriverAllocationTable;
