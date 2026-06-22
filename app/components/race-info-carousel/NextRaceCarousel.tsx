import { getNextRaceInfo } from "@/app/_lib/jolpicaRequests/jolpicaRequests";
import { extractSessions } from "@/app/_lib/sessions/sessionUtils";
import RaceInfoCarousel from "./RaceInfoCarousel";

async function NextRaceCarousel() {
  try {
    const response = await getNextRaceInfo();
    const race = response.data.MRData.RaceTable?.Races?.[0];

    if (!race) return null;

    const sessions = extractSessions(race);

    return (
      <RaceInfoCarousel
        key={`${race.season}-${race.round}`}
        raceName={race.raceName}
        round={race.round}
        sessions={sessions}
      />
    );
  } catch {
    return null;
  }
}

export default NextRaceCarousel;
