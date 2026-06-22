import { Suspense } from "react";
import LeaderboardTable from "./components/table/LeaderboardTable";
import Tile from "./components/tile/Tile";
import DriverAllocationTable from "./components/table/DriverAllocationTable";
import NextRaceCarousel from "./components/race-info-carousel/NextRaceCarousel";

export const dynamic = "force-dynamic";

function HomePage() {
  return (
    <>
      <div className="p-4 pb-0">
        <Suspense fallback={null}>
          <NextRaceCarousel />
        </Suspense>
      </div>
      <div className="w-dvw grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <Tile>
          <Suspense fallback={<div>Loading...</div>}>
            <DriverAllocationTable />
          </Suspense>
        </Tile>
        <Tile>
          <Suspense fallback={<div>Loading...</div>}>
            <LeaderboardTable />
          </Suspense>
        </Tile>
      </div>
    </>
  );
}

export default HomePage;
