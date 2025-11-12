"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { CreateFeatureInput, UpdateFeatureInput } from "@/types";

async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });
  return !!project;
}

export async function createFeature(data: CreateFeatureInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(data.projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const feature = await prisma.feature.create({
    data: {
      name: data.name,
      description: data.description,
      impact: data.impact,
      expanded: data.expanded,
      status: data.status || "IDEA",
      priority: data.priority || 0,
      projectId: data.projectId,
      actionItems: (data.actionItems ?? []) as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard");
  return feature;
}

export async function updateFeature(featureId: string, data: UpdateFeatureInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through project
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { 
      project: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!feature) {
    throw new Error("Feature not found");
  }

  if (!feature.project) {
    throw new Error("Feature's project not found");
  }

  if (feature.project.userId !== session.user.id) {
    throw new Error("You don't have permission to update this feature");
  }

  const { actionItems, ...rest } = data;

  const updated = await prisma.feature.update({
    where: { id: featureId },
    data: {
      ...rest,
      ...(typeof actionItems !== "undefined"
        ? { actionItems: actionItems as Prisma.InputJsonValue }
        : {}),
    },
  });

  revalidatePath("/dashboard");
  return updated;
}

export async function deleteFeature(featureId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { 
      project: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!feature) {
    throw new Error("Feature not found");
  }

  if (!feature.project) {
    throw new Error("Feature's project not found");
  }

  if (feature.project.userId !== session.user.id) {
    throw new Error("You don't have permission to delete this feature");
  }

  await prisma.feature.delete({
    where: { id: featureId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get all features for a project
 */
export async function getFeatures(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const features = await prisma.feature.findMany({
    where: {
      projectId,
    },
    include: {
      tasks: true,
    },
    orderBy: {
      priority: "asc",
    },
  });

  return features;
}

/**
 * Update feature status
 */
export async function updateFeatureStatus(
  featureId: string,
  status: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED"
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { project: true },
  });

  if (!feature || feature.project.userId !== session.user.id) {
    throw new Error("Feature not found");
  }

  const updated = await prisma.feature.update({
    where: { id: featureId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/dashboard");
  return updated;
}

/**
 * Reorder features by priority
 */
export async function reorderFeatures(projectId: string, featureIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  // Update each feature's priority based on its position in the array
  await Promise.all(
    featureIds.map((id, index) =>
      prisma.feature.update({
        where: { id },
        data: { priority: index },
      })
    )
  );

  revalidatePath("/dashboard");
  return { success: true };
}
