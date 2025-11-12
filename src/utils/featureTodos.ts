import type { FeatureActionItems, FeatureTodoItem } from "@/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isFeatureTodoItem = (value: unknown): value is FeatureTodoItem => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.completed === "boolean"
  );
};

export const parseFeatureActionItems = (
  actionItems: FeatureActionItems | null | undefined
): FeatureTodoItem[] => {
  if (!actionItems || actionItems.length === 0) {
    return [];
  }

  return actionItems.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `todo-${index}-${Date.now()}`,
        text: item,
        completed: false,
      };
    }

    if (isFeatureTodoItem(item)) {
      return item;
    }

    return {
      id: `todo-${index}-${Date.now()}`,
      text: String(item),
      completed: false,
    };
  });
};

export const createFeatureTodo = (text: string): FeatureTodoItem => ({
  id: `todo-${Date.now()}-${Math.random()}`,
  text: text.trim(),
  completed: false,
});

export const toggleFeatureTodo = (
  todos: FeatureTodoItem[],
  todoId: string
): FeatureTodoItem[] =>
  todos.map((todo) =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  );

export const updateFeatureTodoText = (
  todos: FeatureTodoItem[],
  todoId: string,
  text: string
): FeatureTodoItem[] =>
  todos.map((todo) =>
    todo.id === todoId ? { ...todo, text: text.trim() } : todo
  );

export const removeFeatureTodo = (
  todos: FeatureTodoItem[],
  todoId: string
): FeatureTodoItem[] => todos.filter((todo) => todo.id !== todoId);

