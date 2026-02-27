import { allocateDrivers } from "@/app/_lib/resultsProcessor/driverAllocator";

/**
 * Test endpoint that runs driver allocation against a real past race.
 * Uses 2025 season, round 12 (British GP) — standings from round 11 are used.
 *
 * POST /api/test/allocate-drivers
 * Optional JSON body: { "season": 2025, "round": 12 }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const season = body.season ?? 2025;
    const round = body.round ?? 12;

    console.log(
      `[TEST] Running allocateDrivers for season ${season}, round ${round}`,
    );

    await allocateDrivers({ season, round });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Driver allocation completed for season ${season}, round ${round}.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[TEST] allocateDrivers failed:", message);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
