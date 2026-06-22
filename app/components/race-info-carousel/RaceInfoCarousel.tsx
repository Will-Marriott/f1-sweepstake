"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { SessionInfo } from "@/app/_lib/sessions/sessionUtils";

type RaceInfoCarouselProps = {
  raceName: string;
  round: string;
  sessions: SessionInfo[];
};

function formatDateTime(
  dateStr: string,
  timeStr: string,
): { date: string; time: string } | null {
  try {
    const date = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(date.getTime())) return null;

    return {
      date: date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  } catch {
    return null;
  }
}

export default function RaceInfoCarousel({
  raceName,
  round,
  sessions,
}: RaceInfoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateActiveIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const cards = container.querySelectorAll<HTMLElement>("[data-index]");

    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < cards.length; i++) {
      const distance = Math.abs(cards[i].offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    setActiveIndex(closestIndex);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateActiveIndex();
    });
  }, [updateActiveIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setHasOverflow(container.scrollWidth > container.clientWidth);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    );
    if (card) {
      card.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  }, []);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {sessions.map((session, index) => {
          const formatted = formatDateTime(session.date, session.time);

          return (
            <div
              key={`${session.label}-${index}`}
              data-index={index}
              className="snap-start shrink-0 w-[80vw] max-w-[350px] rounded-2xl bg-container p-4 shadow-md"
            >
              <p className="text-xs text-foreground/60 uppercase tracking-wide">
                {raceName}
              </p>
              <p className="text-sm font-semibold mb-3">Round {round}</p>
              <p className="text-xl font-bold text-red-600">
                {session.label.toUpperCase()}
              </p>
              {formatted ? (
                <>
                  <p className="text-sm mt-2">{formatted.date}</p>
                  <p className="text-sm">{formatted.time}</p>
                </>
              ) : (
                <p className="text-sm mt-2 text-foreground/60">Time TBC</p>
              )}
            </div>
          );
        })}
      </div>

      {hasOverflow && (
        <div className="flex justify-center gap-2 mt-3">
          {sessions.map((session, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === activeIndex
                  ? "bg-red-600"
                  : "bg-foreground/30 hover:bg-foreground/50"
              }`}
              aria-label={`Go to ${session.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
