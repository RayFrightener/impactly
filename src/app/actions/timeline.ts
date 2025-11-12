"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CreateTimelineEventInput, UpdateTimelineEventInput } from "@/types";

async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });
  return !!project;
}

export async function createTimelineEvent(data: CreateTimelineEventInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(data.projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const event = await prisma.timelineEvent.create({
    data: {
      title: data.title,
      description: data.description,
      date: data.date,
      type: data.type,
      projectId: data.projectId,
      featureId: data.featureId,
    },
  });

  revalidatePath("/dashboard");
  return event;
}

export async function updateTimelineEvent(
  eventId: string,
  data: UpdateTimelineEventInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through project
  const event = await prisma.timelineEvent.findUnique({
    where: { id: eventId },
    include: { project: true },
  });

  if (!event || event.project.userId !== session.user.id) {
    throw new Error("Timeline event not found");
  }

  const updated = await prisma.timelineEvent.update({
    where: { id: eventId },
    data: {
      ...data,
    },
  });

  revalidatePath("/dashboard");
  return updated;
}

export async function deleteTimelineEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const event = await prisma.timelineEvent.findUnique({
    where: { id: eventId },
    include: { project: true },
  });

  if (!event || event.project.userId !== session.user.id) {
    throw new Error("Timeline event not found");
  }

  await prisma.timelineEvent.delete({
    where: { id: eventId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getTimelineEvents(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const events = await prisma.timelineEvent.findMany({
    where: {
      projectId,
    },
    orderBy: {
      date: "asc",
    },
  });

  return events;
}

