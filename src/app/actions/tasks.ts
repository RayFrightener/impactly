"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { trackTaskCreated, trackTaskCompleted } from "./analytics";
import type { CreateTaskInput, UpdateTaskInput } from "@/types";

async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });
  return !!project;
}

export async function createTask(data: CreateTaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(data.projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || "TODO",
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate,
      projectId: data.projectId,
      featureId: data.featureId,
    },
  });

  // Track analytics
  await trackTaskCreated(task.id);

  revalidatePath("/dashboard");
  return task;
}

export async function updateTask(taskId: string, data: UpdateTaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through project
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.userId !== session.user.id) {
    throw new Error("Task not found");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
    },
  });

  // Track if task was completed
  if (task.status !== "DONE" && data.status === "DONE") {
    await trackTaskCompleted(updated.id);
  }

  revalidatePath("/dashboard");
  return updated;
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task || task.project.userId !== session.user.id) {
    throw new Error("Task not found");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get all tasks for a project
 */
export async function getTasks(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tasks;
}

/**
 * Get tasks for a specific feature
 */
export async function getTasksByFeature(featureId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through feature
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { project: true },
  });

  if (!feature || feature.project.userId !== session.user.id) {
    throw new Error("Feature not found");
  }

  const tasks = await prisma.task.findMany({
    where: {
      featureId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tasks;
}
