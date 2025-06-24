import * as projectService from './project-service';
import type { Project } from '../types';

describe('Project Service Additional Coverage', () => {
  beforeEach(() => {
    // Reset the in-memory store
    (projectService as any).projectsData = [];
    (projectService as any).nextId = 1;
  });

  it('covers all edge cases in deleteProject', async () => {
    // Test unknown visibility
    const unknownProject: Project = {
      id: '1',
      name: 'Unknown Visibility',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'unknown' as any,
    };
    
    (projectService as any).projectsData.push(unknownProject);
    
    const result = await projectService.deleteProject('1', 'user-1');
    expect(result).toBe(false);
  });

  it('covers all edge cases in addItemToProject', async () => {
    // Test unknown visibility
    const unknownProject: Project = {
      id: '1',
      name: 'Unknown Visibility',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'unknown' as any,
    };
    
    (projectService as any).projectsData.push(unknownProject);
    
    const result = await projectService.addItemToProject('1', 'item-1', 'user-1');
    expect(result).toBeUndefined();
  });

  it('covers missing itemIds array in addItemToProject', async () => {
    const projectWithoutItemIds = {
      id: '1',
      name: 'No ItemIds',
      description: 'Test',
      ownerId: 'user-1',
      visibility: 'private' as const,
    };
    
    (projectService as any).projectsData.push(projectWithoutItemIds);
    
    const result = await projectService.addItemToProject('1', 'item-1', 'user-1');
    expect(result).toBeTruthy();
    expect(result?.itemIds).toContain('item-1');
  });

  it('covers all console.log paths in deleteProject', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Test private project deletion
    const privateProject: Project = {
      id: '1',
      name: 'Private',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'private',
    };
    
    (projectService as any).projectsData.push(privateProject);
    await projectService.deleteProject('1', 'user-1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Private project'));

    // Test shared project with no items
    const sharedEmptyProject: Project = {
      id: '2',
      name: 'Shared Empty',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'shared',
    };
    
    (projectService as any).projectsData.push(sharedEmptyProject);
    await projectService.deleteProject('2', 'user-1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('with no items deleted'));

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('covers edge cases in project filtering', async () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Private 1',
        description: 'Test',
        ownerId: 'user-1',
        itemIds: [],
        visibility: 'private',
      },
      {
        id: '2',
        name: 'Shared 1',
        description: 'Test',
        ownerId: 'user-1',
        itemIds: [],
        visibility: 'shared',
      },
      {
        id: '3',
        name: 'Private 2',
        description: 'Test',
        ownerId: 'user-2',
        itemIds: [],
        visibility: 'private',
      }
    ];

    (projectService as any).projectsData = projects;

    const ownedProjects = await projectService.getProjectsByOwner('user-1');
    expect(ownedProjects).toHaveLength(2);

    const publicProjects = await projectService.getPublicProjects();
    expect(publicProjects).toHaveLength(1);
    expect(publicProjects[0].visibility).toBe('shared');
  });

  it('covers updateProject edge cases', async () => {
    const project: Project = {
      id: '1',
      name: 'Original',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: [],
      visibility: 'private',
    };
    
    (projectService as any).projectsData.push(project);

    // Test updating with all possible fields
    const updates = {
      name: 'Updated',
      description: 'Updated description',
      itemIds: ['item-1', 'item-2'],
      visibility: 'shared' as const,
      sharedWith: ['user-2'],
    };

    const result = await projectService.updateProject('1', updates);
    expect(result?.name).toBe('Updated');
    expect(result?.sharedWith).toEqual(['user-2']);
    expect(result?.ownerId).toBe('user-1'); // Should not change
  });

  it('covers all branches in removeItemFromProject', async () => {
    const project: Project = {
      id: '1',
      name: 'Test',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: ['item-1', 'item-2'],
      visibility: 'private',
    };
    
    (projectService as any).projectsData.push(project);

    // Test removing item that doesn't exist
    const result1 = await projectService.removeItemFromProject('1', 'item-3', 'user-1');
    expect(result1?.itemIds).toEqual(['item-1', 'item-2']);

    // Test removing existing item
    const result2 = await projectService.removeItemFromProject('1', 'item-1', 'user-1');
    expect(result2?.itemIds).toEqual(['item-2']);

    // Test with project that has no itemIds
    const projectNoItems = {
      id: '2',
      name: 'No Items',
      description: 'Test',
      ownerId: 'user-1',
      visibility: 'private' as const,
    };
    
    (projectService as any).projectsData.push(projectNoItems);
    
    const result3 = await projectService.removeItemFromProject('2', 'item-1', 'user-1');
    expect(result3).toBeTruthy();
  });

  it('covers console.warn paths in addItemToProject', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    const project: Project = {
      id: '1',
      name: 'Test',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: ['item-1'],
      visibility: 'private',
    };
    
    (projectService as any).projectsData.push(project);

    // Test permission denied
    await projectService.addItemToProject('1', 'item-2', 'user-2');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));

    // Test adding duplicate item
    await projectService.addItemToProject('1', 'item-1', 'user-1');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('already in project'));

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('covers all deletion scenarios with items', async () => {
    // Mock dummyItems for deletion tests
    const originalDummyItems = require('../lib/dummy-data').dummyItems;
    const mockItems = [
      { id: 'item-1', ownerId: 'user-1' },
      { id: 'item-2', ownerId: 'user-2' },
      { id: 'item-3', ownerId: 'user-3' },
    ];
    
    jest.doMock('../lib/dummy-data', () => ({
      dummyItems: mockItems
    }));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Test shared project with items from multiple users
    const sharedProjectMultiUser: Project = {
      id: '1',
      name: 'Multi User',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: ['item-1', 'item-2', 'item-3'],
      visibility: 'shared',
    };
    
    (projectService as any).projectsData.push(sharedProjectMultiUser);
    
    const result1 = await projectService.deleteProject('1', 'user-1');
    expect(result1).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('cannot be deleted'));

    // Test shared project with items from single user
    const sharedProjectSingleUser: Project = {
      id: '2',
      name: 'Single User',
      description: 'Test',
      ownerId: 'user-1',
      itemIds: ['item-1'],
      visibility: 'shared',
    };
    
    (projectService as any).projectsData.push(sharedProjectSingleUser);
    
    const result2 = await projectService.deleteProject('2', 'user-1');
    expect(result2).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('with 1 unique item owner'));

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});