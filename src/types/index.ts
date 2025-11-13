// Re-export Prisma generated types
import type {
  User,
  Project as PrismaProject,
  Thought as PrismaThought,
  Feature as PrismaFeature,
  Task as PrismaTask,
  TimelineEvent as PrismaTimelineEvent,
  JournalEntry,
  ProjectStatus,
  FeatureStatus,
  TaskStatus,
  TaskPriority,
  EventType,
} from "@prisma/client";

export type {
  User,
  PrismaProject as Project,
  PrismaThought as Thought,
  PrismaFeature as Feature,
  PrismaTask as Task,
  PrismaTimelineEvent as TimelineEvent,
  JournalEntry,
  ProjectStatus,
  FeatureStatus,
  TaskStatus,
  TaskPriority,
  EventType,
};

// Input types for creating entities
export interface CreateProjectInput {
  name: string;
  description?: string;
  moreInfo?: string;
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  moreInfo?: string | null;
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

export interface CreateThoughtInput {
  text: string;
  expanded?: string;
  projectId: string;
}

export interface UpdateThoughtInput {
  text?: string;
  expanded?: string | null;
}

export interface FeatureTodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export type FeatureActionItems = Array<FeatureTodoItem | string>;

export interface CreateFeatureInput {
  name: string;
  description: string;
  impact: string;
  expanded?: string;
  status?: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";
  priority?: number;
  projectId: string;
  actionItems?: FeatureActionItems;
}

export interface UpdateFeatureInput {
  name?: string;
  description?: string;
  impact?: string;
  expanded?: string | null;
  status?: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";
  priority?: number;
  actionItems?: FeatureActionItems;
  completedAt?: Date | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: Date;
  projectId: string;
  featureId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: Date | null;
  featureId?: string | null;
  completedAt?: Date | null;
}

export interface CreateTimelineEventInput {
  title: string;
  description?: string;
  date: Date;
  type: "PROJECT_START" | "MVP_COMPLETE" | "BETA_LAUNCH" | "PUBLIC_RELEASE" | "MAJOR_PIVOT" | "KEY_DECISION" | "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE" | "STAKEHOLDER_REVIEW" | "INTEGRATION_COMPLETE" | "PERFORMANCE_MILESTONE";
  projectId: string;
  featureId?: string;
}

export interface UpdateTimelineEventInput {
  title?: string;
  description?: string | null;
  date?: Date;
  type?: "PROJECT_START" | "MVP_COMPLETE" | "BETA_LAUNCH" | "PUBLIC_RELEASE" | "MAJOR_PIVOT" | "KEY_DECISION" | "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE" | "STAKEHOLDER_REVIEW" | "INTEGRATION_COMPLETE" | "PERFORMANCE_MILESTONE";
  featureId?: string | null;
}

export interface CreateJournalEntryInput {
  content: string;
  mood?: string;
  tags?: string[];
}

export interface UpdateJournalEntryInput {
  content?: string;
  mood?: string | null;
  tags?: string[] | null;
}

// Extended types with relations for frontend use
export interface ProjectWithRelations {
  id: string;
  name: string;
  description: string | null;
  moreInfo: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  userId: string;
  thoughts: ThoughtWithRelations[];
  features: FeatureWithTasks[];
  tasks: PrismaTask[];
  timeline: PrismaTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureWithTasks {
  id: string;
  name: string;
  description: string;
  impact: string;
  expanded: string | null;
  status: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";
  priority: number;
  projectId: string;
  tasks: PrismaTask[];
  actionItems: FeatureActionItems;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ThoughtWithRelations {
  id: string;
  text: string;
  expanded: string | null;
  projectId: string;
  createdAt: Date;
}
