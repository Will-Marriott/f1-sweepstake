import { allocateDrivers } from "../../_lib/driverAllocator/driverAllocator";

export async function POST() {
  return await allocateDrivers();
}
