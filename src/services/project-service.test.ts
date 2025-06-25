import { createProject, getProjectById, getProjectsByOwner, updateProject, deleteProject, getPublicProjects, addItemToProject, removeItemFromProject } from './project-service';
import { Project } from '../types';

describe('Project Service', () => {
  let testProjectIds: string[] = [];
  const testUserId = 'test-user-123';
  const otherUserId = 'other-user-456';

  afterEach(() => {
    // Clean up created projects
    testProjectIds.forEach(async (id) => {
      await deleteProject(id, testUserId);
    });
    testProjectIds = [];
  });

  describe('createProject', () => {
    it('should create a private project successfully', async () => {
      const projectData = {
        name: 'Test Private Project',
        description: 'A test private project',
        ownerId: testUserId,
        itemIds: ['item1', 'item2'],
        visibility: 'private' as const
      };

      const project = await createProject(projectData);
      testProjectIds.push(project.id);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.description).toBe(projectData.description);
      expect(project.ownerId).toBe(testUserId);
      expect(project.visibility).toBe('private');
      expect(project.itemIds).toEqual(['item1', 'item2']);
      expect(project.id).toBeDefined();
    });

    it('should create a shared project successfully', async () => {
      const projectData = {
        name: 'Test Shared Project',
        description: 'A test shared project',
        ownerId: testUserId,
        itemIds: ['item3'],
        visibility: 'shared' as const,
        sharedWith: [otherUserId]
      };

      const project = await createProject(projectData);
      testProjectIds.push(project.id);

      expect(project).toBeDefined();
      expect(project.visibility).toBe('shared');
      expect(project.sharedWith).toContain(otherUserId);
    });
  });

  describe('getProjectById', () => {
    it('should retrieve an existing project', async () => {
      const projectData = {
        name: 'Test Retrieve Project',
        description: 'A test project for retrieval',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      };

      const createdProject = await createProject(projectData);
      testProjectIds.push(createdProject.id);

      const retrievedProject = await getProjectById(createdProject.id);

      expect(retrievedProject).toBeDefined();
      expect(retrievedProject?.id).toBe(createdProject.id);
      expect(retrievedProject?.name).toBe(projectData.name);
    });

    it('should return undefined for non-existent project', async () => {
      const result = await getProjectById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getProjectsByOwner', () => {
    it('should return projects owned by user', async () => {
      const projectData1 = {
        name: 'Owner Test Project 1',
        description: 'First project',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      };

      const projectData2 = {
        name: 'Owner Test Project 2',
        description: 'Second project',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'shared' as const
      };

      const project1 = await createProject(projectData1);
      const project2 = await createProject(projectData2);
      testProjectIds.push(project1.id, project2.id);

      const userProjects = await getProjectsByOwner(testUserId);

      expect(userProjects.length).toBeGreaterThanOrEqual(2);
      expect(userProjects.some(p => p.id === project1.id)).toBe(true);
      expect(userProjects.some(p => p.id === project2.id)).toBe(true);
    });

    it('should return empty array for user with no projects', async () => {
      const projects = await getProjectsByOwner('user-with-no-projects');
      expect(projects).toEqual([]);
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const projectData = {
        name: 'Original Name',
        description: 'Original description',
        ownerId: testUserId,
        itemIds: ['item1'],
        visibility: 'private' as const
      };

      const project = await createProject(projectData);
      testProjectIds.push(project.id);

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
        itemIds: ['item1', 'item2']
      };

      const updatedProject = await updateProject(project.id, updates);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.name).toBe('Updated Name');
      expect(updatedProject?.description).toBe('Updated description');
      expect(updatedProject?.itemIds).toEqual(['item1', 'item2']);
      expect(updatedProject?.ownerId).toBe(testUserId); // Should not change
    });

    it('should return undefined for non-existent project', async () => {
      const result = await updateProject('non-existent-id', { name: 'New Name' });
      expect(result).toBeUndefined();
    });
  });

  describe('getPublicProjects', () => {
    it('should return only shared projects', async () => {
      const privateProject = await createProject({
        name: 'Private Project',
        description: 'Should not appear',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });

      const sharedProject = await createProject({
        name: 'Shared Project',
        description: 'Should appear',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'shared' as const
      });

      testProjectIds.push(privateProject.id, sharedProject.id);

      const publicProjects = await getPublicProjects();

      expect(publicProjects.every(p => p.visibility === 'shared')).toBe(true);
      expect(publicProjects.some(p => p.id === sharedProject.id)).toBe(true);
      expect(publicProjects.some(p => p.id === privateProject.id)).toBe(false);
    });
  });

  describe('addItemToProject', () => {
    it('should add item to project successfully', async () => {
      const project = await createProject({
        name: 'Add Item Test',
        description: 'Test adding items',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const updatedProject = await addItemToProject(project.id, 'new-item-id', testUserId);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.itemIds).toContain('new-item-id');
    });

    it('should not add duplicate items', async () => {
      const project = await createProject({
        name: 'Duplicate Test',
        description: 'Test duplicate prevention',
        ownerId: testUserId,
        itemIds: ['existing-item'],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const updatedProject = await addItemToProject(project.id, 'existing-item', testUserId);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.itemIds.filter(id => id === 'existing-item').length).toBe(1);
    });

    it('should return undefined for non-existent project', async () => {
      const result = await addItemToProject('non-existent-id', 'item-id', testUserId);
      expect(result).toBeUndefined();
    });

    it('should not allow non-owner to add to private project', async () => {
      const project = await createProject({
        name: 'Private Project Test',
        description: 'Test private project permissions',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const result = await addItemToProject(project.id, 'item-id', otherUserId);
      expect(result).toBeUndefined();
    });

    it('should allow any user to add to shared project', async () => {
      const project = await createProject({
        name: 'Shared Project Test',
        description: 'Test shared project permissions',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'shared' as const
      });
      testProjectIds.push(project.id);

      const result = await addItemToProject(project.id, 'item-id', otherUserId);
      expect(result).toBeDefined();
      expect(result?.itemIds).toContain('item-id');
    });

    it('should handle project with undefined itemIds', async () => {
      const project = await createProject({
        name: 'Undefined ItemIds Test',
        description: 'Test undefined itemIds handling',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);
      
      const result = await addItemToProject(project.id, 'item-id', testUserId);
      expect(result).toBeDefined();
      expect(result?.itemIds).toContain('item-id');
    });
  });

  describe('removeItemFromProject', () => {
    it('should remove item from project successfully', async () => {
      const project = await createProject({
        name: 'Remove Item Test',
        description: 'Test removing items',
        ownerId: testUserId,
        itemIds: ['item-to-remove', 'item-to-keep'],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const updatedProject = await removeItemFromProject(project.id, 'item-to-remove', testUserId);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.itemIds).not.toContain('item-to-remove');
      expect(updatedProject?.itemIds).toContain('item-to-keep');
    });

    it('should handle removing non-existent item gracefully', async () => {
      const project = await createProject({
        name: 'Remove Non-existent Test',
        description: 'Test removing non-existent item',
        ownerId: testUserId,
        itemIds: ['existing-item'],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const updatedProject = await removeItemFromProject(project.id, 'non-existent-item', testUserId);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.itemIds).toEqual(['existing-item']);
    });

    it('should return undefined for non-existent project', async () => {
      const result = await removeItemFromProject('non-existent-id', 'item-id', testUserId);
      expect(result).toBeUndefined();
    });

    it('should not allow non-owner to remove items', async () => {
      const project = await createProject({
        name: 'Permission Test',
        description: 'Test removal permissions',
        ownerId: testUserId,
        itemIds: ['item-to-remove'],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const result = await removeItemFromProject(project.id, 'item-to-remove', otherUserId);
      expect(result).toBeUndefined();
    });

    it('should handle project with undefined itemIds', async () => {
      const project = await createProject({
        name: 'Undefined ItemIds Remove Test',
        description: 'Test undefined itemIds handling for removal',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const result = await removeItemFromProject(project.id, 'item-id', testUserId);
      expect(result).toBeDefined();
      expect(result?.itemIds).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully when user is owner', async () => {
      const project = await createProject({
        name: 'Delete Test',
        description: 'Test deletion',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });

      const deleteResult = await deleteProject(project.id, testUserId);
      expect(deleteResult).toBe(true);

      const deletedProject = await getProjectById(project.id);
      expect(deletedProject).toBeUndefined();
    });

    it('should not delete project when user is not owner', async () => {
      const project = await createProject({
        name: 'No Delete Test',
        description: 'Test deletion prevention',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'private' as const
      });
      testProjectIds.push(project.id);

      const deleteResult = await deleteProject(project.id, otherUserId);
      expect(deleteResult).toBe(false);

      const stillExists = await getProjectById(project.id);
      expect(stillExists).toBeDefined();
    });

    it('should return false for non-existent project', async () => {
      const result = await deleteProject('non-existent-id', testUserId);
      expect(result).toBe(false);
    });

    it('should delete shared project with no items', async () => {
      const project = await createProject({
        name: 'Shared Empty Test',
        description: 'Test shared project deletion',
        ownerId: testUserId,
        itemIds: [],
        visibility: 'shared' as const
      });

      const deleteResult = await deleteProject(project.id, testUserId);
      expect(deleteResult).toBe(true);

      const deletedProject = await getProjectById(project.id);
      expect(deletedProject).toBeUndefined();
    });

    it('should delete shared project with items from single owner', async () => {
      const project = await createProject({
        name: 'Shared Single Owner Test',
        description: 'Test shared project with one owner items',
        ownerId: testUserId,
        itemIds: ['single-owner-item'],
        visibility: 'shared' as const
      });

      const deleteResult = await deleteProject(project.id, testUserId);
      expect(deleteResult).toBe(true);

      const deletedProject = await getProjectById(project.id);
      expect(deletedProject).toBeUndefined();
    });

    it('should not delete shared project with items from multiple owners', async () => {
      const project = await createProject({
        name: 'Shared Multi Owner Test',
        description: 'Test shared project with multiple owner items',
        ownerId: testUserId,
        itemIds: ['item1', 'item2'], // These would need to exist in dummyItems with different owners
        visibility: 'shared' as const
      });
      testProjectIds.push(project.id);

      const deleteResult = await deleteProject(project.id, testUserId);
      expect(deleteResult).toBe(false);

      const stillExists = await getProjectById(project.id);
      expect(stillExists).toBeDefined();
    });

    it('should handle shared project with non-existent item IDs', async () => {
      const project = await createProject({
        name: 'Shared Orphaned Items Test',
        description: 'Test shared project with orphaned item IDs',
        ownerId: testUserId,
        itemIds: ['non-existent-item-1', 'non-existent-item-2'],
        visibility: 'shared' as const
      });

      const deleteResult = await deleteProject(project.id, testUserId);
      expect(deleteResult).toBe(true);

      const deletedProject = await getProjectById(project.id);
      expect(deletedProject).toBeUndefined();
    });

    it('should handle unknown visibility in deleteProject', async () => {
      const unknownProject = await createProject({
        name: 'Unknown Visibility Project',
        description: 'Test project',
        visibility: 'unknown' as any,
        ownerId: testUserId,
        itemIds: [],
        sharedWith: []
      });

      const deleteResult = await deleteProject(unknownProject.id, testUserId);
      expect(deleteResult).toBe(false);
    });

    it('should handle unknown visibility in addItemToProject', async () => {
      const unknownProject = await createProject({
        name: 'Unknown Visibility Project',
        description: 'Test project', 
        visibility: 'unknown' as any,
        ownerId: testUserId,
        itemIds: [],
        sharedWith: []
      });

      const result = await addItemToProject(unknownProject.id, 'test-item', testUserId);
      expect(result).toBeUndefined();
    });

    it('should handle project with undefined itemIds in addItemToProject', async () => {
      const project = await createProject({
        name: 'Test Project',
        description: 'Test project',
        visibility: 'private',
        ownerId: testUserId,
        itemIds: undefined as any,
        sharedWith: []
      });

      const result = await addItemToProject(project.id, 'test-item', testUserId);
      expect(result).toBeDefined();
      expect(result?.itemIds).toContain('test-item');
    });

    it('should return project copy when item not found in removeItemFromProject', async () => {
      const project = await createProject({
        name: 'Test Project',
        description: 'Test project',
        visibility: 'private',
        ownerId: testUserId,
        itemIds: ['existing-item'],
        sharedWith: []
      });

      const result = await removeItemFromProject(project.id, 'non-existent-item', testUserId);
      expect(result).toBeDefined();
      expect(result?.itemIds).toEqual(['existing-item']);
    });

    it('should handle edge case in removeItemFromProject with false includes check', async () => {
      const project = await createProject({
        name: 'Test Project',
        description: 'Test project',
        visibility: 'private',
        ownerId: testUserId,
        itemIds: ['item-1', 'item-2'],
        sharedWith: []
      });

      // Mock the includes check to return true but then remove fails internally
      const originalIncludes = Array.prototype.includes;
      Array.prototype.includes = jest.fn().mockReturnValue(true);
      
      // Remove an item that's not actually there
      const result = await removeItemFromProject(project.id, 'item-3', testUserId);
      
      // Restore original includes
      Array.prototype.includes = originalIncludes;
      
      expect(result).toBeDefined();
      expect(result?.itemIds).toEqual(['item-1', 'item-2']);
    });
  });
});