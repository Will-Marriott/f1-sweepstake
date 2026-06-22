import { Race } from "../jolpicaRequests/types";

export type SessionInfo = {
  label: string;
  date: string;
  time: string;
};

function parseSessionDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export function extractSessions(race: Race): SessionInfo[] {
  const sessions: SessionInfo[] = [];

  sessions.push({
    label: "Race",
    date: race.date,
    time: race.time ?? "00:00:00Z",
  });

  const qualifying = race.Qualifying;
  if (qualifying) {
    sessions.push({
      label: "Qualifying",
      date: qualifying.date,
      time: qualifying.time,
    });
  }

  const sprint = race.Sprint;
  if (sprint) {
    sessions.push({
      label: "Sprint",
      date: sprint.date,
      time: sprint.time,
    });
  }

  const sprintQualifying = race.SprintQualifying;
  if (sprintQualifying) {
    sessions.push({
      label: "Sprint Qualifying",
      date: sprintQualifying.date,
      time: sprintQualifying.time,
    });
  }

  sessions.sort((a, b) => {
    const dateA = parseSessionDateTime(a.date, a.time);
    const dateB = parseSessionDateTime(b.date, b.time);
    return dateB.getTime() - dateA.getTime();
  });

  return sessions;
}
