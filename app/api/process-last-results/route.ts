import { processLastResults } from "@/app/_lib/resultsProcessor/resultsProcessor";

export async function POST() {
  const info = await processLastResults();
  return new Response(JSON.stringify(info), { status: 202 });
}
