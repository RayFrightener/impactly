"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { trackUserEvent } from "@/app/actions/analytics";
import { requireAdmin } from "@/utils/admin";

export type FeedbackType = "BUG" | "FEATURE_REQUEST" | "IMPROVEMENT" | "PRAISE" | "OTHER";
export type FeedbackStatus = "PENDING" | "REVIEWING" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
export type FeedbackPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface CreateFeedbackInput {
  type: FeedbackType;
  title: string;
  description: string;
  page?: string;
  screenshot?: string;
  isAnonymous?: boolean;
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  adminNotes?: string;
}

/**
 * Create new feedback
 */
export async function createFeedback(data: CreateFeedbackInput) {
  const session = await auth();
  
  const feedback = await prisma.feedback.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description,
      page: data.page,
      screenshot: data.screenshot,
      userId: data.isAnonymous ? null : session?.user?.id || null,
      status: "PENDING",
      priority: "MEDIUM",
    },
  });

  // Track feedback submission event
  if (session?.user?.id && !data.isAnonymous) {
    await trackUserEvent("feedback_submitted", {
      feedbackId: feedback.id,
      type: data.type,
    });
  }

  revalidatePath("/roadmap");
  return feedback;
}

/**
 * Get all feedback (for roadmap)
 */
export async function getAllFeedback() {
  const feedback = await prisma.feedback.findMany({
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      votes: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { upvotes: "desc" },
      { createdAt: "desc" },
    ],
  });

  return feedback;
}

/**
 * Get user's own feedback
 */
export async function getUserFeedback() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const feedback = await prisma.feedback.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      votes: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return feedback;
}

/**
 * Update feedback (admin only)
 */
export async function updateFeedback(feedbackId: string, data: UpdateFeedbackInput) {
  const session = await auth();
  
  // Only allow admin to update
  await requireAdmin();

  const feedback = await prisma.feedback.update({
    where: {
      id: feedbackId,
    },
    data,
  });

  revalidatePath("/roadmap");
  revalidatePath("/admin/feedback");
  return feedback;
}

/**
 * Delete feedback
 */
export async function deleteFeedback(feedbackId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if user owns the feedback or is admin
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  });

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  const isOwner = feedback.userId === session.user.id;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail && session.user.email === adminEmail;

  if (!isOwner && !isAdmin) {
    throw new Error("Unauthorized");
  }

  await prisma.feedback.delete({
    where: { id: feedbackId },
  });

  revalidatePath("/roadmap");
  return { success: true };
}

/**
 * Toggle upvote on feedback
 */
export async function toggleFeedbackVote(feedbackId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized - please sign in to vote");
  }

  // Check if user already voted
  const existingVote = await prisma.feedbackVote.findUnique({
    where: {
      feedbackId_userId: {
        feedbackId,
        userId: session.user.id,
      },
    },
  });

  if (existingVote) {
    // Remove vote
    await prisma.feedbackVote.delete({
      where: {
        id: existingVote.id,
      },
    });

    // Decrement upvote count
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        upvotes: {
          decrement: 1,
        },
      },
    });
  } else {
    // Add vote
    await prisma.feedbackVote.create({
      data: {
        feedbackId,
        userId: session.user.id,
      },
    });

    // Increment upvote count
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        upvotes: {
          increment: 1,
        },
      },
    });
  }

  revalidatePath("/roadmap");
  return { success: true };
}

/**
 * Get feedback stats (for admin)
 */
export async function getFeedbackStats() {
  const session = await auth();
  
  await requireAdmin();

  const [
    totalFeedback,
    pendingCount,
    completedCount,
    featureRequestCount,
    bugCount,
  ] = await Promise.all([
    prisma.feedback.count(),
    prisma.feedback.count({ where: { status: "PENDING" } }),
    prisma.feedback.count({ where: { status: "COMPLETED" } }),
    prisma.feedback.count({ where: { type: "FEATURE_REQUEST" } }),
    prisma.feedback.count({ where: { type: "BUG" } }),
  ]);

  return {
    totalFeedback,
    pendingCount,
    completedCount,
    featureRequestCount,
    bugCount,
  };
}

