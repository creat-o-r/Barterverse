import { Project, Item } from '../types'; // Added Item type
import { dummyItems } from '../lib/dummy-data'; // Added dummyItems for checking item ownership

let projectsData: Project[] = []; // In-memory store
let nextId = 1; // Simple ID generator

export const createProject = async (projectDetails: Omit<Project, 'id'>): Promise<Project> => {
  const newProject: Project = {
    id: (nextId++).toString(),
    ...projectDetails,
  };
  projectsData.push(newProject);
  return newProject;
};

export const getProjectById = async (projectId: string): Promise<Project | undefined> => {
  const project = projectsData.find(project => project.id === projectId);
  return project ? { ...project } : undefined; // Return a copy if found
};

export const getProjectsByOwner = async (ownerId: string): Promise<Project[]> => {
  const ownedProjects = projectsData.filter(project => project.ownerId === ownerId);
  return ownedProjects.map(p => ({ ...p })); // Return copies
};

export const updateProject = async (
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'ownerId'>>
): Promise<Project | undefined> => {
  const projectIndex = projectsData.findIndex(project => project.id === projectId);
  if (projectIndex === -1) {
    return undefined;
  }
  projectsData[projectIndex] = {
    ...projectsData[projectIndex],
    ...updates,
  };
  return projectsData[projectIndex];
};

export const deleteProject = async (projectId: string, currentUserId: string): Promise<boolean> => {
  const projectIndex = projectsData.findIndex(p => p.id === projectId);
  if (projectIndex === -1) {
    console.warn(`deleteProject: Project not found with ID ${projectId}`);
    return false;
  }

  const project = projectsData[projectIndex];

  // Primary check: Only the project owner can initiate deletion
  if (project.ownerId !== currentUserId) {
    console.warn(`deleteProject: User ${currentUserId} attempted to delete project ${projectId} owned by ${project.ownerId}. Permission denied.`);
    return false;
  }

  // Apply deletion rules based on visibility
  if (project.visibility === 'private') {
    projectsData.splice(projectIndex, 1); // Remove the project
    console.log(`deleteProject: Private project ${projectId} deleted by owner ${currentUserId}.`);
    return true;
  } else if (project.visibility === 'shared') {
    // For shared projects, check item ownership condition
    if (!project.itemIds || project.itemIds.length === 0) {
      projectsData.splice(projectIndex, 1); // Remove if no items
      console.log(`deleteProject: Shared project ${projectId} with no items deleted by owner ${currentUserId}.`);
      return true;
    }

    const itemsInProject = dummyItems.filter(item => project.itemIds.includes(item.id));
    if (itemsInProject.length === 0 && project.itemIds.length > 0) {
        // This case implies item IDs exist in project.itemIds but corresponding items are not in dummyItems.
        // This could be an data integrity issue or items were deleted.
        // For safety, if project has item IDs but no actual items found, treat as "empty" for deletion rule.
        console.warn(`deleteProject: Shared project ${projectId} has item IDs but no matching items found in dummyItems. Allowing deletion by owner ${currentUserId}.`);
        projectsData.splice(projectIndex, 1);
        return true;
    }

    const uniqueItemOwnerIds = new Set(itemsInProject.map(item => item.ownerId));
    const numberOfUniqueItemOwners = uniqueItemOwnerIds.size;

    if (numberOfUniqueItemOwners <= 1) {
      projectsData.splice(projectIndex, 1); // Remove the project
      console.log(`deleteProject: Shared project ${projectId} with ${numberOfUniqueItemOwners} unique item owner(s) deleted by owner ${currentUserId}.`);
      return true;
    } else {
      console.warn(`deleteProject: Shared project ${projectId} cannot be deleted by owner ${currentUserId} because it contains items from ${numberOfUniqueItemOwners} unique users.`);
      return false; // Deletion denied
    }
  } else {
    // Should not happen with current 'private' | 'shared' visibility type
    console.error(`deleteProject: Unknown project visibility encountered: ${project.visibility} for project ${projectId}`);
    return false;
  }
};

export const getPublicProjects = async (): Promise<Project[]> => {
  const publicProjects = projectsData.filter(project =>
    project.visibility === 'public' || project.visibility === 'shared'
  );
  return publicProjects.map(p => ({ ...p })); // Return copies
};

// Removed getSharedProjectsForUser function

export const addItemToProject = async (projectId: string, itemId: string, currentUserId: string): Promise<Project | undefined> => {
  const projectIndex = projectsData.findIndex(p => p.id === projectId);
  if (projectIndex === -1) {
    console.warn(`addItemToProject: Project not found with ID ${projectId}`);
    return undefined;
  }

  const project = projectsData[projectIndex];

  // Permission check
  if (project.visibility === 'private') {
    if (project.ownerId !== currentUserId) {
      console.warn(`addItemToProject: User ${currentUserId} attempted to add item to private project ${projectId} owned by ${project.ownerId}. Permission denied.`);
      return undefined; // Permission denied for private projects if not owner
    }
  } else if (project.visibility === 'shared') {
    // Any user can add to a shared project.
    // No specific permission check needed here for 'shared' other than project existence.
    console.log(`addItemToProject: User ${currentUserId} adding item to shared project ${projectId}.`);
  } else {
    // Should not happen if visibility type is strictly 'private' | 'shared'
    console.error(`addItemToProject: Unknown project visibility encountered: ${project.visibility} for project ${projectId}`);
    return undefined;
  }

  // Ensure itemIds array exists (it should if project was created correctly)
  if (!project.itemIds) {
    project.itemIds = [];
  }

  // Add item if not already present
  if (!project.itemIds.includes(itemId)) {
    const updatedProject = {
      ...project,
      itemIds: [...project.itemIds, itemId],
    };
    projectsData[projectIndex] = updatedProject; // Update immutably in the array
    return { ...updatedProject }; // Return a copy
  } else {
    console.log(`addItemToProject: Item ${itemId} already in project ${projectId}. No change made.`);
    return { ...project }; // Return a copy of the unmodified project
  }
};

export const removeItemFromProject = async (projectId: string, itemId: string, currentUserId: string): Promise<Project | undefined> => {
  const projectIndex = projectsData.findIndex(p => p.id === projectId);
  if (projectIndex === -1) {
    console.warn(`removeItemFromProject: Project with ID ${projectId} not found.`);
    return undefined; // Project not found
  }

  const project = projectsData[projectIndex];
  if (project.ownerId !== currentUserId) {
    console.warn(`removeItemFromProject: User ${currentUserId} attempted to remove item from project ${projectId} owned by ${project.ownerId}. Permission denied.`);
    return undefined; // Permission denied
  }

  if (!project.itemIds || !project.itemIds.includes(itemId)) {
    // Item not in project, or itemIds array doesn't exist, return current project state
    return { ...project };
  }

  const initialItemCount = project.itemIds.length;
  const updatedItemIds = project.itemIds.filter(id => id !== itemId);

  if (updatedItemIds.length < initialItemCount) { // If an item was actually removed
    const updatedProject = {
      ...project,
      itemIds: updatedItemIds,
    };
    projectsData[projectIndex] = updatedProject; // Replace the old project object
    return { ...updatedProject }; // Return a copy of the updated project
  }

  return { ...project }; // Return a copy, even if item wasn't found (should be caught by includes check above)
};
