"use client";

import { useState } from "react";
import Table from "./Table";

type WeekData = {
  subtitle: string;
  hasPoints: boolean;
  allocations: Array<{
    playerName: string;
    driver1: string;
    driver2: string;
    points: string;
  }>;
};

function DriverAllocationsPanel({ weeksData }: { weeksData: WeekData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (weeksData.length === 0) return <div>No data</div>;

  const current = weeksData[currentIndex];
  const total = weeksData.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCurrentIndex((i) => Math.min(i + 1, total - 1))}
          disabled={currentIndex === total - 1}
          className="text-lg disabled:opacity-20 hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Older round"
        >
          ‹
        </button>
        <div className="text-center min-w-0 mx-2">
          <h2 className="text-lg font-bold">Drivers</h2>
          <p className="text-sm text-gray-500 truncate">{current.subtitle}</p>
        </div>
        <button
          onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          disabled={currentIndex === 0}
          className="text-lg disabled:opacity-20 hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Newer round"
        >
          ›
        </button>
      </div>
      <Table
        tableData={current.allocations}
        columns={[
          { key: "playerName", label: "Player" },
          { key: "driver1", label: "Driver 1", className: "truncate" },
          { key: "driver2", label: "Driver 2", className: "truncate" },
          ...(current.hasPoints
            ? [{ key: "points" as const, label: "Pts", className: "text-right w-12" }]
            : []),
        ]}
      />
    </div>
  );
}

export default DriverAllocationsPanel;
