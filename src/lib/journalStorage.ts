export interface JournalSession {
  id: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  rawThoughts: string[];
  organizedThoughts: Array<{
    id: string;
    originalText: string;
    type:
      | "action-item"
      | "requirement"
      | "feature"
      | "improvement"
      | "question"
      | "idea"
      | "note";
    category?: string;
    priority?: "low" | "medium" | "high";
    expanded?: string;
    selected: boolean;
    relatedFeatureId?: string;
    relatedFeatureName?: string;
    improvementMode?: "existing" | "new";
  }>;
  metadata: {
    duration: number;
    wordCount: number;
    lineCount: number;
  };
  name?: string;
  savedAt?: string;
  isTemplate?: boolean;
  currentLine?: string;
  sessionStartTime?: string;
  path?: string;
  parentId?: string;
  [key: string]: unknown;
}

export interface SavedJournalMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  projectId?: string;
  path?: string;
  parentId?: string;
}

export interface JournalFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  type: "folder";
}

export interface JournalFile extends JournalSession {
  type: "file";
  path: string;
  parentId?: string;
}

export type JournalFileSystemItem = JournalFile | JournalFolder;

export function saveJournalToStorage(
  name: string,
  data: JournalSession,
  parentPath?: string,
  projectId?: string
): string {
  if (typeof window === "undefined") return "";
  
  const id = data.id || Date.now().toString();
  const path = parentPath || (projectId ? `/project-${projectId}` : "/");
  const savedJournal: JournalSession = {
    ...data,
    id,
    name,
    path,
    projectId: projectId || data.projectId,
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(`journal-saved-${id}`, JSON.stringify(savedJournal));

  // Update the saved journals list
  const savedList = listSavedJournals();
  const existingIndex = savedList.findIndex((j) => j.id === id);
  const metadata: SavedJournalMetadata = {
    id,
    name,
    createdAt: savedJournal.createdAt,
    updatedAt: savedJournal.updatedAt,
    wordCount: savedJournal.metadata?.wordCount || 0,
    projectId: savedJournal.projectId,
    path: savedJournal.path,
  };

  if (existingIndex >= 0) {
    savedList[existingIndex] = metadata;
  } else {
    savedList.push(metadata);
  }

  localStorage.setItem("journal-saved-list", JSON.stringify(savedList));

  // Update centralized tree
  const treeDataStr = localStorage.getItem("journal-filesystem-tree");
  let treeData: { folders: JournalFolder[]; files: JournalFile[] } = { folders: [], files: [] };
  if (treeDataStr) {
    try {
      treeData = JSON.parse(treeDataStr);
    } catch (e) {
      console.error("Error parsing folder tree:", e);
      treeData = { folders: [], files: [] };
    }
  }
  
  // Add or update file in tree
  const fileInTree: JournalFile = {
    ...savedJournal,
    type: "file",
    path: savedJournal.path || (projectId ? `/project-${projectId}` : "/"),
    parentId: parentPath === "/" ? undefined : parentPath,
  };
  
  const fileIndex = treeData.files.findIndex((f) => f.id === id);
  if (fileIndex >= 0) {
    treeData.files[fileIndex] = fileInTree;
  } else {
    if (!treeData.files) {
      treeData.files = [];
    }
    treeData.files.push(fileInTree);
  }
  localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));

  return id;
}

export function loadJournalFromStorage(id: string): JournalSession | null {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem(`journal-saved-${id}`);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Error loading journal:", e);
    return null;
  }
}

export function listSavedJournals(): SavedJournalMetadata[] {
  if (typeof window === "undefined") return [];

  const saved = localStorage.getItem("journal-saved-list");
  if (!saved) return [];

  try {
    const list = JSON.parse(saved);
    // Filter out any journals that no longer exist
    return list.filter((j: SavedJournalMetadata) => {
      return localStorage.getItem(`journal-saved-${j.id}`) !== null;
    });
  } catch (e) {
    console.error("Error listing journals:", e);
    return [];
  }
}

export function deleteJournal(id: string): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(`journal-saved-${id}`);

  const savedList = listSavedJournals();
  const filtered = savedList.filter((j) => j.id !== id);
  localStorage.setItem("journal-saved-list", JSON.stringify(filtered));
}

export function exportJournalToJSON(data: JournalSession): string {
  return JSON.stringify(data, null, 2);
}

export function importJournalFromJSON(json: string): JournalSession | null {
  try {
    const parsed = JSON.parse(json);
    // Validate structure
    if (
      !parsed.rawThoughts ||
      !Array.isArray(parsed.rawThoughts) ||
      !parsed.organizedThoughts ||
      !Array.isArray(parsed.organizedThoughts)
    ) {
      throw new Error("Invalid journal format");
    }
    return parsed as JournalSession;
  } catch (e) {
    console.error("Error importing journal:", e);
    return null;
  }
}

// File System Functions

export function createFolder(
  name: string,
  parentPath: string,
  projectId?: string
): JournalFolder {
  if (typeof window === "undefined") {
    throw new Error("Cannot create folder on server");
  }

  if (!name || !name.trim()) {
    throw new Error("Folder name cannot be empty");
  }

  const trimmedName = name.trim();
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Determine the path based on parentPath and projectId
  let path: string;
  let parentId: string | undefined;
  
  if (parentPath === "/") {
    // When creating at root, create it directly at root, not in /general
    // The user can organize into /general later if needed
    path = `/${trimmedName}`;
    parentId = undefined; // No parent = root level
  } else {
    // Creating in a subfolder
    path = `${parentPath}/${trimmedName}`;
    parentId = parentPath;
  }

  const folder: JournalFolder = {
    id,
    name: trimmedName,
    path,
    parentId,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "folder",
  };

  // Save folder to localStorage
  localStorage.setItem(`journal-folder-${id}`, JSON.stringify(folder));
  
  // Update folder tree storage
  const treeDataStr = localStorage.getItem("journal-filesystem-tree");
  let treeData: { folders: JournalFolder[]; files: JournalFile[] } = { folders: [], files: [] };
  if (treeDataStr) {
    try {
      treeData = JSON.parse(treeDataStr);
    } catch (e) {
      console.error("Error parsing folder tree:", e);
      treeData = { folders: [], files: [] };
    }
  }
  
  // Check if folder already exists
  if (!treeData.folders.find((f) => f.id === folder.id)) {
    if (!treeData.folders) {
      treeData.folders = [];
    }
    treeData.folders.push(folder);
    localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
  }

  return folder;
}

export function createJournalFile(
  name: string,
  parentPath: string,
  data: JournalSession,
  projectId?: string
): JournalFile {
  if (typeof window === "undefined") {
    throw new Error("Cannot create file on server");
  }

  const id = data.id || Date.now().toString();
  const path = parentPath === "/"
    ? (projectId ? `/project-${projectId}/${name}` : `/${name}`)
    : `${parentPath}/${name}`;

  const file: JournalFile = {
    ...data,
    id,
    name,
    path,
    parentId: parentPath === "/" ? undefined : parentPath,
    projectId: projectId || data.projectId,
    type: "file",
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(`journal-saved-${id}`, JSON.stringify(file));
  
  // Update saved list
  const savedList = listSavedJournals();
  const metadata: SavedJournalMetadata = {
    id,
    name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    wordCount: file.metadata?.wordCount || 0,
    projectId: file.projectId,
    path: file.path,
    parentId: file.parentId,
  };
  
  const existingIndex = savedList.findIndex((j) => j.id === id);
  if (existingIndex >= 0) {
    savedList[existingIndex] = metadata;
  } else {
    savedList.push(metadata);
  }
  localStorage.setItem("journal-saved-list", JSON.stringify(savedList));

  // Update centralized tree
  const treeDataStr = localStorage.getItem("journal-filesystem-tree");
  let treeData: { folders: JournalFolder[]; files: JournalFile[] } = { folders: [], files: [] };
  if (treeDataStr) {
    try {
      treeData = JSON.parse(treeDataStr);
    } catch (e) {
      console.error("Error parsing folder tree:", e);
      treeData = { folders: [], files: [] };
    }
  }
  
  // Add or update file in tree
  const fileIndex = treeData.files.findIndex((f) => f.id === id);
  if (fileIndex >= 0) {
    treeData.files[fileIndex] = file;
  } else {
    if (!treeData.files) {
      treeData.files = [];
    }
    treeData.files.push(file);
  }
  localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));

  return file;
}

export function getFileSystemTree(projectId?: string): JournalFileSystemItem[] {
  if (typeof window === "undefined") return [];

  const treeData = localStorage.getItem("journal-filesystem-tree");
  const savedList = listSavedJournals();
  
  const folders: JournalFolder[] = [];
  const files: JournalFile[] = [];

  // Load folders and verify they still exist in individual storage
  if (treeData) {
    try {
      const parsed = JSON.parse(treeData);
      const treeFolders = parsed.folders || [];
      // Only include folders that still exist in individual storage
      treeFolders.forEach((folder: JournalFolder) => {
        const folderData = localStorage.getItem(`journal-folder-${folder.id}`);
        if (folderData) {
          try {
            const parsedFolder = JSON.parse(folderData);
            folders.push(parsedFolder);
          } catch (e) {
            console.error("Error parsing folder:", e);
          }
        }
      });
    } catch (e) {
      console.error("Error parsing folder tree:", e);
    }
  }

  // Load files from saved journals
  savedList.forEach((meta) => {
    const fileData = loadJournalFromStorage(meta.id);
    if (fileData) {
      files.push({
        ...fileData,
        type: "file",
        path: fileData.path || (fileData.projectId ? `/project-${fileData.projectId}` : "/"),
      } as JournalFile);
    }
  });

  // Filter by project if specified
  let items: JournalFileSystemItem[] = [...folders, ...files];
  
  if (projectId && projectId !== "all") {
    items = items.filter((item) => item.projectId === projectId);
  }

  return items;
}

export function getItemsByPath(path: string, projectId?: string): JournalFileSystemItem[] {
  const allItems = getFileSystemTree(projectId);
  return allItems.filter((item) => {
    if (path === "/") {
      // Root: show items with no parentId (directly at root)
      // This includes folders created at root and files with no parent
      return !item.parentId;
    }
    // Direct children only: parentId matches the path
    return item.parentId === path;
  });
}

export function renameItem(id: string, newName: string, type: "file" | "folder"): void {
  if (typeof window === "undefined") return;

  if (type === "folder") {
    const folderData = localStorage.getItem(`journal-folder-${id}`);
    if (!folderData) return;

    const folder: JournalFolder = JSON.parse(folderData);
    const oldPath = folder.path;
    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");

    folder.name = newName;
    folder.path = newPath;
    folder.updatedAt = new Date().toISOString();

    localStorage.setItem(`journal-folder-${id}`, JSON.stringify(folder));

    // Update all children paths
    const allItems = getFileSystemTree();
    allItems.forEach((item) => {
      if (item.path?.startsWith(oldPath + "/")) {
        const newItemPath = item.path.replace(oldPath, newPath);
        if (item.type === "folder") {
          const childFolder = { ...item, path: newItemPath } as JournalFolder;
          localStorage.setItem(`journal-folder-${item.id}`, JSON.stringify(childFolder));
        } else {
          const childFile = { ...item, path: newItemPath } as JournalFile;
          localStorage.setItem(`journal-saved-${item.id}`, JSON.stringify(childFile));
        }
      }
    });

    // Update centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Update folder in tree
        const folderIndex = treeData.folders.findIndex((f) => f.id === id);
        if (folderIndex >= 0) {
          treeData.folders[folderIndex] = folder;
        }
        
        // Update all child folders in tree
        treeData.folders.forEach((f, idx) => {
          if (f.path?.startsWith(oldPath + "/")) {
            const newItemPath = f.path.replace(oldPath, newPath);
            treeData.folders[idx] = { ...f, path: newItemPath };
          }
        });
        
        // Update all child files in tree
        treeData.files.forEach((f, idx) => {
          if (f.path?.startsWith(oldPath + "/")) {
            const newItemPath = f.path.replace(oldPath, newPath);
            treeData.files[idx] = { ...f, path: newItemPath };
          }
        });
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating folder tree during rename:", e);
      }
    }
  } else {
    const file = loadJournalFromStorage(id);
    if (!file) return;

    const oldPath = file.path;
    file.name = newName;
    file.updatedAt = new Date().toISOString();
    
    const pathParts = file.path?.split("/") || [];
    pathParts[pathParts.length - 1] = newName;
    file.path = pathParts.join("/");

    localStorage.setItem(`journal-saved-${id}`, JSON.stringify(file));

    // Update metadata list
    const savedList = listSavedJournals();
    const index = savedList.findIndex((j) => j.id === id);
    if (index >= 0) {
      savedList[index].name = newName;
      savedList[index].path = file.path;
      localStorage.setItem("journal-saved-list", JSON.stringify(savedList));
    }

    // Update centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Update file in tree
        const fileIndex = treeData.files.findIndex((f) => f.id === id);
        if (fileIndex >= 0) {
          treeData.files[fileIndex] = { ...file, type: "file" } as JournalFile;
        }
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating file tree during rename:", e);
      }
    }
  }
}

export function deleteItem(id: string, type: "file" | "folder"): void {
  if (typeof window === "undefined") return;

  if (type === "folder") {
    const folderData = localStorage.getItem(`journal-folder-${id}`);
    if (!folderData) return;

    const folder: JournalFolder = JSON.parse(folderData);
    const folderPath = folder.path;
    
    // Delete all children
    const allItems = getFileSystemTree();
    const childIds: string[] = [];
    allItems.forEach((item) => {
      if (item.path?.startsWith(folderPath + "/")) {
        childIds.push(item.id);
        if (item.type === "folder") {
          localStorage.removeItem(`journal-folder-${item.id}`);
        } else {
          deleteJournal(item.id);
        }
      }
    });

    // Remove folder from individual storage
    localStorage.removeItem(`journal-folder-${id}`);
    
    // Remove from centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Remove this folder and all its children from the centralized tree
        treeData.folders = treeData.folders.filter((f) => {
          // Remove the folder itself
          if (f.id === id) return false;
          // Remove any child folders
          if (f.path?.startsWith(folderPath + "/")) return false;
          return true;
        });
        
        // Remove any child files from the tree
        treeData.files = treeData.files.filter((f) => {
          if (f.path?.startsWith(folderPath + "/")) return false;
          return true;
        });
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating folder tree during delete:", e);
      }
    }
  } else {
    // Delete file
    deleteJournal(id);
    
    // Remove from centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Remove file from tree
        treeData.files = treeData.files.filter((f) => f.id !== id);
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating file tree during delete:", e);
      }
    }
  }
}

export function moveItem(id: string, newParentPath: string, type: "file" | "folder"): void {
  if (typeof window === "undefined") return;

  if (type === "folder") {
    const folderData = localStorage.getItem(`journal-folder-${id}`);
    if (!folderData) return;

    const folder: JournalFolder = JSON.parse(folderData);
    const oldPath = folder.path;
    const folderName = folder.name;
    const newPath = newParentPath === "/" 
      ? (folder.projectId ? `/project-${folder.projectId}/${folderName}` : `/${folderName}`)
      : `${newParentPath}/${folderName}`;

    folder.path = newPath;
    folder.parentId = newParentPath === "/" ? undefined : newParentPath;
    folder.updatedAt = new Date().toISOString();

    localStorage.setItem(`journal-folder-${id}`, JSON.stringify(folder));

    // Update all children paths
    const allItems = getFileSystemTree();
    allItems.forEach((item) => {
      if (item.path?.startsWith(oldPath + "/")) {
        const newItemPath = item.path.replace(oldPath, newPath);
        if (item.type === "folder") {
          const childFolder = { ...item, path: newItemPath, parentId: newPath } as JournalFolder;
          localStorage.setItem(`journal-folder-${item.id}`, JSON.stringify(childFolder));
        } else {
          const childFile = { ...item, path: newItemPath, parentId: newPath } as JournalFile;
          localStorage.setItem(`journal-saved-${item.id}`, JSON.stringify(childFile));
        }
      }
    });

    // Update centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Update folder in tree
        const folderIndex = treeData.folders.findIndex((f) => f.id === id);
        if (folderIndex >= 0) {
          treeData.folders[folderIndex] = folder;
        }
        
        // Update all child folders in tree
        treeData.folders.forEach((f, idx) => {
          if (f.path?.startsWith(oldPath + "/")) {
            const newItemPath = f.path.replace(oldPath, newPath);
            treeData.folders[idx] = { ...f, path: newItemPath, parentId: newPath };
          }
        });
        
        // Update all child files in tree
        treeData.files.forEach((f, idx) => {
          if (f.path?.startsWith(oldPath + "/")) {
            const newItemPath = f.path.replace(oldPath, newPath);
            treeData.files[idx] = { ...f, path: newItemPath, parentId: newPath };
          }
        });
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating folder tree during move:", e);
      }
    }
  } else {
    const file = loadJournalFromStorage(id);
    if (!file) return;

    const oldPath = file.path;
    const fileName = file.name || "journal";
    const newPath = newParentPath === "/"
      ? (file.projectId ? `/project-${file.projectId}/${fileName}` : `/${fileName}`)
      : `${newParentPath}/${fileName}`;

    file.path = newPath;
    file.parentId = newParentPath === "/" ? undefined : newParentPath;
    file.updatedAt = new Date().toISOString();

    localStorage.setItem(`journal-saved-${id}`, JSON.stringify(file));

    // Update metadata list
    const savedList = listSavedJournals();
    const index = savedList.findIndex((j) => j.id === id);
    if (index >= 0) {
      savedList[index].path = newPath;
      savedList[index].parentId = file.parentId;
      localStorage.setItem("journal-saved-list", JSON.stringify(savedList));
    }

    // Update centralized tree
    const treeDataStr = localStorage.getItem("journal-filesystem-tree");
    if (treeDataStr) {
      try {
        const treeData: { folders: JournalFolder[]; files: JournalFile[] } = JSON.parse(treeDataStr);
        
        // Update file in tree
        const fileIndex = treeData.files.findIndex((f) => f.id === id);
        if (fileIndex >= 0) {
          treeData.files[fileIndex] = { ...file, type: "file" } as JournalFile;
        }
        
        localStorage.setItem("journal-filesystem-tree", JSON.stringify(treeData));
      } catch (e) {
        console.error("Error updating file tree during move:", e);
      }
    }
  }
}

export function getItemPath(id: string): string | null {
  if (typeof window === "undefined") return null;

  // Check if it's a folder
  const folderData = localStorage.getItem(`journal-folder-${id}`);
  if (folderData) {
    const folder: JournalFolder = JSON.parse(folderData);
    return folder.path;
  }

  // Check if it's a file
  const file = loadJournalFromStorage(id);
  return file?.path || null;
}

export function getItemMetadata(id: string): JournalFileSystemItem | null {
  if (typeof window === "undefined") return null;

  // Check if it's a folder
  const folderData = localStorage.getItem(`journal-folder-${id}`);
  if (folderData) {
    return JSON.parse(folderData) as JournalFolder;
  }

  // Check if it's a file
  const file = loadJournalFromStorage(id);
  if (file) {
    return {
      ...file,
      type: "file",
      path: file.path || (file.projectId ? `/project-${file.projectId}` : "/"),
    } as JournalFile;
  }

  return null;
}

export function filterByProject(
  items: JournalFileSystemItem[],
  projectId?: string
): JournalFileSystemItem[] {
  if (!projectId || projectId === "all") return items;
  
  return items.filter((item) => item.projectId === projectId);
}

// Migration function
export function migrateFlatStructureToFileSystem(): void {
  if (typeof window === "undefined") return;

  const hasMigrated = localStorage.getItem("journal-filesystem-migrated");
  if (hasMigrated) return;

  const savedList = listSavedJournals();
  if (savedList.length === 0) {
    // No journals to migrate, just mark as migrated
    localStorage.setItem("journal-filesystem-migrated", "true");
    return;
  }

  // Load existing tree to preserve any manually created/deleted folders
  const treeDataStr = localStorage.getItem("journal-filesystem-tree");
  let existingTree: { folders: JournalFolder[]; files: JournalFile[] } = { folders: [], files: [] };
  if (treeDataStr) {
    try {
      existingTree = JSON.parse(treeDataStr);
    } catch (e) {
      console.error("Error parsing existing tree:", e);
      existingTree = { folders: [], files: [] };
    }
  }

  // Track existing folder paths to avoid duplicates
  const existingFolderPaths = new Set(existingTree.folders.map((f) => f.path));
  const existingFolderIds = new Set(existingTree.folders.map((f) => f.id));

  const folders: JournalFolder[] = [...existingTree.folders];
  
  // No need to create a default "home" folder - root "/" is the home

  // Group by project and create folders only if they don't exist
  const projectFolders: { [key: string]: JournalFolder } = {};
  existingTree.folders.forEach((f) => {
    if (f.projectId) {
      projectFolders[f.projectId] = f;
    }
  });

  savedList.forEach((meta) => {
    const file = loadJournalFromStorage(meta.id);
    if (!file) return;

    if (file.projectId) {
      const folderPath = `/project-${file.projectId}`;
      if (!projectFolders[file.projectId] && !existingFolderPaths.has(folderPath)) {
        const projectFolder: JournalFolder = {
          id: `project-${file.projectId}`,
          name: `Project ${file.projectId}`,
          path: folderPath,
          projectId: file.projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: "folder",
        };
        projectFolders[file.projectId] = projectFolder;
        folders.push(projectFolder);
        existingFolderPaths.add(folderPath);
      }
    }

    // Only update file path if it doesn't have one
    if (!file.path) {
      if (file.projectId) {
        file.path = `/project-${file.projectId}/${file.name || "journal"}`;
        file.parentId = `/project-${file.projectId}`;
      } else {
        file.path = `/${file.name || "journal"}`;
        file.parentId = undefined;
      }
      localStorage.setItem(`journal-saved-${file.id}`, JSON.stringify(file));
    }
  });

  // Save folder structure (preserving existing folders)
  localStorage.setItem("journal-filesystem-tree", JSON.stringify({ folders, files: existingTree.files || [] }));
  
  // Mark as migrated
  localStorage.setItem("journal-filesystem-migrated", "true");
}

