import { allocateDrivers } from "../../_lib/resultsProcessor/driverAllocator";

export async function POST() {
  return await allocateDrivers();
}
