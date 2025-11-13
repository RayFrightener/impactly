"use client";

import { useMemo, useState } from "react";
import type {
  TimelineEvent as PrismaTimelineEvent,
  ProjectWithRelations,
} from "@/types";
import {
  getEventImpactLevel,
  getEventSize,
  getEventColor,
  EVENT_TYPE_LABELS,
  type EventType,
} from "@/utils/timeline";

interface HorizontalTimelineProps {
  project: ProjectWithRelations;
  events: PrismaTimelineEvent[];
  onEventClick: (event: PrismaTimelineEvent) => void;
  projectFeatures?: Array<{ id: string; name: string }>;
}

type TimeScale = "hours" | "days" | "weeks";

interface TimeScaleInfo {
  scale: TimeScale;
  unitMs: number;
  labelFormat: (date: Date) => string;
}

interface GroupedEvent {
  id: string;
  position: number;
  events: Array<
    PrismaTimelineEvent & {
      position: number;
      impactLevel: number;
      size: number;
      color: string;
    }
  >;
  dateRange: { start: Date; end: Date };
  isGroup: true;
}

interface IndividualEvent {
  id: string;
  position: number;
  event: PrismaTimelineEvent;
  impactLevel: number;
  size: number;
  color: string;
  isGroup: false;
}

type TimelineItem = GroupedEvent | IndividualEvent;

// Calculate time scale based on time span
function calculateTimeScale(startDate: Date, endDate: Date): TimeScaleInfo {
  const totalSpanMs = endDate.getTime() - startDate.getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const fourWeeksMs = 4 * 7 * 24 * 60 * 60 * 1000;

  if (totalSpanMs < threeDaysMs) {
    // Hour-based spacing
    return {
      scale: "hours",
      unitMs: 60 * 60 * 1000, // 1 hour
      labelFormat: (date: Date) => {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          month: "short",
          day: "numeric",
        });
      },
    };
  } else if (totalSpanMs < fourWeeksMs) {
    // Day-based spacing
    return {
      scale: "days",
      unitMs: 24 * 60 * 60 * 1000, // 1 day
      labelFormat: (date: Date) => {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      },
    };
  } else {
    // Week-based grouping
    return {
      scale: "weeks",
      unitMs: 7 * 24 * 60 * 60 * 1000, // 1 week
      labelFormat: (date: Date) => {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${weekEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
      },
    };
  }
}

// Group events by time bucket for week-based mode
function groupEventsByTimeBucket(
  events: Array<
    PrismaTimelineEvent & {
      position: number;
      impactLevel: number;
      size: number;
      color: string;
    }
  >,
  startDate: Date,
  endDate: Date,
  scaleInfo: TimeScaleInfo
): TimelineItem[] {
  if (scaleInfo.scale !== "weeks") {
    // Return individual events for hours/days mode
    return events.map((event) => ({
      id: event.id,
      position: event.position,
      event,
      impactLevel: event.impactLevel,
      size: event.size,
      color: event.color,
      isGroup: false,
    }));
  }

  // Group by week
  const groups = new Map<string, Array<(typeof events)[0]>>();

  events.forEach((event) => {
    const eventDate = new Date(event.date);
    const weekStart = new Date(eventDate);
    weekStart.setDate(eventDate.getDate() - eventDate.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekKey = weekStart.toISOString();

    if (!groups.has(weekKey)) {
      groups.set(weekKey, []);
    }
    groups.get(weekKey)!.push(event);
  });

  // Calculate total span for position calculation
  const totalSpan = endDate.getTime() - startDate.getTime();

  // Convert groups to TimelineItems
  const timelineItems: TimelineItem[] = [];

  groups.forEach((groupEvents, weekKey) => {
    if (groupEvents.length === 1) {
      // Single event, don't group
      const event = groupEvents[0];
      timelineItems.push({
        id: event.id,
        position: event.position,
        event,
        impactLevel: event.impactLevel,
        size: event.size,
        color: event.color,
        isGroup: false,
      });
    } else {
      // Multiple events, create group
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Calculate group position as center of week
      const weekCenter = new Date(
        weekStart.getTime() + (weekEnd.getTime() - weekStart.getTime()) / 2
      );
      const timeFromStart = weekCenter.getTime() - startDate.getTime();
      const position = Math.max(
        0,
        Math.min(100, (timeFromStart / totalSpan) * 100)
      );

      timelineItems.push({
        id: `group-${weekKey}`,
        position,
        events: groupEvents,
        dateRange: { start: weekStart, end: weekEnd },
        isGroup: true,
      });
    }
  });

  // Sort by position
  return timelineItems.sort((a, b) => a.position - b.position);
}

// Calculate event position based on time scale
function calculateEventPosition(
  eventDate: Date,
  startDate: Date,
  totalSpanMs: number
): number {
  const timeFromStart = eventDate.getTime() - startDate.getTime();
  return Math.max(0, Math.min(100, (timeFromStart / totalSpanMs) * 100));
}

// Split text into lines of 2 words each for vertical stacking
function splitTextIntoTwoWordLines(text: string): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += 2) {
    const line = words.slice(i, i + 2).join(" ");
    lines.push(line);
  }

  return lines;
}

// Apply minimum spacing between timeline items to prevent overlap
function applyMinimumSpacing(
  items: TimelineItem[],
  minSpacingPercent: number = 2
): TimelineItem[] {
  if (items.length <= 1) return items;

  const sortedItems = [...items].sort((a, b) => a.position - b.position);
  const adjustedItems: TimelineItem[] = [];

  for (let i = 0; i < sortedItems.length; i++) {
    const currentItem = sortedItems[i];
    let adjustedPosition = currentItem.position;

    // Check spacing with previous item
    if (i > 0) {
      const prevItem = adjustedItems[i - 1];
      const spacing = currentItem.position - prevItem.position;

      if (spacing < minSpacingPercent) {
        adjustedPosition = prevItem.position + minSpacingPercent;
      }
    }

    // Check spacing with next item to avoid pushing too far
    if (i < sortedItems.length - 1) {
      const nextItem = sortedItems[i + 1];
      const maxPosition = nextItem.position - minSpacingPercent;

      if (adjustedPosition > maxPosition) {
        adjustedPosition = Math.max(currentItem.position, maxPosition);
      }
    }

    // Create adjusted item
    if (currentItem.isGroup) {
      adjustedItems.push({
        ...currentItem,
        position: Math.min(100, adjustedPosition),
      });
    } else {
      adjustedItems.push({
        ...currentItem,
        position: Math.min(100, adjustedPosition),
      });
    }
  }

  return adjustedItems;
}

export default function HorizontalTimeline({
  project,
  events,
  onEventClick,
  projectFeatures = [],
}: HorizontalTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const timelineData = useMemo(() => {
    if (events.length === 0) {
      return null;
    }

    // Sort events by date
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Start date is project creation date
    const startDate = new Date(project.createdAt);

    // End date is the latest event date
    const endDate = new Date(sortedEvents[sortedEvents.length - 1].date);

    // Calculate total time span in milliseconds
    const totalSpan = endDate.getTime() - startDate.getTime();

    // Minimum span to ensure visibility
    const minSpan = 60 * 60 * 1000; // 1 hour in ms
    const actualSpan = Math.max(totalSpan, minSpan);

    // Calculate time scale
    const scaleInfo = calculateTimeScale(startDate, endDate);

    // Process events with positions and styling
    const processedEvents = sortedEvents.map((event) => {
      const eventDate = new Date(event.date);
      const position = calculateEventPosition(eventDate, startDate, actualSpan);

      const impactLevel = getEventImpactLevel(event.type as EventType);
      const size = getEventSize(impactLevel);
      const color = getEventColor(event.type as EventType);

      return {
        ...event,
        position,
        impactLevel,
        size,
        color,
      };
    });

    // Group events if needed
    let timelineItems = groupEventsByTimeBucket(
      processedEvents,
      startDate,
      endDate,
      scaleInfo
    );

    // Apply minimum spacing to prevent overlap
    timelineItems = applyMinimumSpacing(timelineItems, 2);

    return {
      startDate,
      endDate,
      totalSpan: actualSpan,
      scaleInfo,
      items: timelineItems,
    };
  }, [events, project.createdAt]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (!timelineData || timelineData.items.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No timeline events yet.</p>
          <p className="text-sm text-text-secondary">
            Add events to see them on the timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      {/* Date Labels */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-text-secondary">
          <div className="font-medium text-text-primary">Start</div>
          <div>
            {timelineData.scaleInfo.labelFormat(timelineData.startDate)}
          </div>
        </div>
        <div className="text-sm text-text-secondary text-right">
          <div className="font-medium text-text-primary">Latest Event</div>
          <div>{timelineData.scaleInfo.labelFormat(timelineData.endDate)}</div>
        </div>
      </div>

      {/* Centered Timeline Container */}
      <div className="flex justify-center">
        <div className="w-full max-w-[1200px]">
          {/* Scrollable Timeline Container */}
          <div
            className="overflow-x-auto pb-4"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="relative min-w-full" style={{ minHeight: "200px" }}>
              {/* Timeline Track (Horizontal Line) */}
              <div
                className="absolute top-1/2 left-0 right-0 h-1 bg-progress rounded-full"
                style={{ transform: "translateY(-50%)" }}
              />

              {/* Event Markers and Groups */}
              {timelineData.items.map((item) => {
                if (item.isGroup) {
                  const group = item;
                  const isExpanded = expandedGroups.has(group.id);

                  return (
                    <div key={group.id}>
                      {/* Group Marker */}
                      <div
                        className="absolute cursor-pointer group"
                        style={{
                          left: `${group.position}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                        onClick={() => toggleGroupExpansion(group.id)}
                      >
                        {/* Group Marker Circle (larger) */}
                        <div
                          className="relative rounded-full border-2 border-background shadow-lg transition-all hover:scale-110"
                          style={{
                            width: "32px",
                            height: "32px",
                            backgroundColor: "var(--theme-accent)",
                          }}
                        >
                          {/* Count Badge */}
                          <div className="absolute -top-1 -right-1 bg-surface border border-border rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-text-primary">
                            {group.events.length}
                          </div>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg min-w-[200px]">
                              <div className="text-xs font-medium text-text-primary mb-2">
                                {group.events.length} Events
                              </div>
                              <div className="text-xs text-text-secondary mb-1">
                                {timelineData.scaleInfo.labelFormat(
                                  group.dateRange.start
                                )}
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {group.events.slice(0, 5).map((event) => (
                                  <div
                                    key={event.id}
                                    className="text-xs text-text-secondary"
                                  >
                                    • {event.title}
                                  </div>
                                ))}
                                {group.events.length > 5 && (
                                  <div className="text-xs text-text-secondary italic">
                                    +{group.events.length - 5} more
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="w-2 h-2 bg-surface border-r border-b border-border transform rotate-45"></div>
                            </div>
                          </div>
                        </div>

                        {/* Group Label */}
                        <div
                          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center"
                          style={{ minWidth: "120px" }}
                        >
                          <div className="text-xs font-medium text-text-primary">
                            {group.events.length} Events
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {timelineData.scaleInfo.labelFormat(
                              group.dateRange.start
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Individual Events */}
                      {isExpanded &&
                        group.events.map((event) => {
                          const relatedFeature = event.featureId
                            ? projectFeatures.find(
                                (f) => f.id === event.featureId
                              )
                            : null;

                          return (
                            <div
                              key={event.id}
                              className="absolute cursor-pointer group"
                              style={{
                                left: `${event.position}%`,
                                top: "60%",
                                transform: "translate(-50%, -50%)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event);
                              }}
                            >
                              {/* Event Marker Circle */}
                              <div
                                className="relative rounded-full border-2 border-background shadow-lg transition-all hover:scale-110"
                                style={{
                                  width: `${event.size}px`,
                                  height: `${event.size}px`,
                                  backgroundColor: event.color,
                                }}
                                title={event.title}
                              >
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg min-w-[200px] max-w-[300px]">
                                    <div className="text-xs font-medium text-text-primary mb-1">
                                      {event.title}
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                      {EVENT_TYPE_LABELS[
                                        event.type as EventType
                                      ] || event.type}
                                    </div>
                                    <div className="text-xs text-text-secondary mt-1">
                                      {new Date(event.date).toLocaleDateString(
                                        "en-US",
                                        {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "numeric",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </div>
                                    {event.description && (
                                      <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border line-clamp-2">
                                        {event.description}
                                      </div>
                                    )}
                                    {relatedFeature && (
                                      <div className="text-xs text-text-secondary mt-1 pt-1 border-t border-border">
                                        Feature: {relatedFeature.name}
                                      </div>
                                    )}
                                    <div className="text-xs text-text-secondary mt-2 pt-1 border-t border-border italic">
                                      Click to edit
                                    </div>
                                  </div>
                                  {/* Tooltip Arrow */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="w-2 h-2 bg-surface border-r border-b border-border transform rotate-45"></div>
                                  </div>
                                </div>
                              </div>

                              {/* Event Label */}
                              <div
                                className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center"
                                style={{ minWidth: "120px" }}
                              >
                                <div className="text-xs text-text-secondary">
                                  {timelineData.scaleInfo.labelFormat(
                                    new Date(event.date)
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                } else {
                  // Individual event
                  const event = item.event;
                  const relatedFeature = event.featureId
                    ? projectFeatures.find((f) => f.id === event.featureId)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="absolute cursor-pointer group"
                      style={{
                        left: `${item.position}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={() => onEventClick(event)}
                    >
                      {/* Event Marker Circle */}
                      <div
                        className="relative rounded-full border-2 border-background shadow-lg transition-all hover:scale-110"
                        style={{
                          width: `${item.size}px`,
                          height: `${item.size}px`,
                          backgroundColor: item.color,
                        }}
                        title={event.title}
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg min-w-[200px] max-w-[300px]">
                            <div className="text-xs font-medium text-text-primary mb-1">
                              {event.title}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {EVENT_TYPE_LABELS[event.type as EventType] ||
                                event.type}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              {new Date(event.date).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                            {event.description && (
                              <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border line-clamp-2">
                                {event.description}
                              </div>
                            )}
                            {relatedFeature && (
                              <div className="text-xs text-text-secondary mt-1 pt-1 border-t border-border">
                                Feature: {relatedFeature.name}
                              </div>
                            )}
                            <div className="text-xs text-text-secondary mt-2 pt-1 border-t border-border italic">
                              Click to edit
                            </div>
                          </div>
                          {/* Tooltip Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="w-2 h-2 bg-surface border-r border-b border-border transform rotate-45"></div>
                          </div>
                        </div>
                      </div>

                      {/* Event Label (below marker) */}
                      <div
                        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center"
                        style={{ minWidth: "120px" }}
                      >
                        <div className="text-xs text-text-secondary">
                          {timelineData.scaleInfo.labelFormat(
                            new Date(event.date)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-xs font-medium text-text-primary mb-3">
          Impact Levels
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--theme-accent)" }}
            />
            <span>Highest (5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--theme-progress)" }}
            />
            <span>High (4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--theme-button)" }}
            />
            <span>Medium-High (3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--theme-text-secondary)" }}
            />
            <span>Medium (2)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
