"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CreateJournalEntryInput, UpdateJournalEntryInput } from "@/types";

export async function createJournalEntry(data: CreateJournalEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const entry = await prisma.journalEntry.create({
    data: {
      content: data.content,
      mood: data.mood,
      tags: data.tags || [],
      userId: session.user.id,
    },
  });

  revalidatePath("/journal");
  return entry;
}

export async function getJournalEntries() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return entries;
}

export async function getJournalEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const entry = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      userId: session.user.id,
    },
  });

  return entry;
}

export async function updateJournalEntry(entryId: string, data: UpdateJournalEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      userId: session.user.id,
    },
  });

  if (!existing) {
    throw new Error("Journal entry not found");
  }

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      content: data.content,
      mood: data.mood,
      tags: data.tags ?? undefined,
    },
  });

  revalidatePath("/journal");
  return updated;
}

export async function deleteJournalEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      userId: session.user.id,
    },
  });

  if (!existing) {
    throw new Error("Journal entry not found");
  }

  await prisma.journalEntry.delete({
    where: { id: entryId },
  });

  revalidatePath("/journal");
  return { success: true };
}

