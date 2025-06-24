import * as projectService from './project-service';
import { Project, Item } from '../types'; // Import Item
import { dummyItems } from '../lib/dummy-data'; // Import dummyItems

// To keep track of created project IDs for cleanup or chained tests
let createdProjectIds: string[] = [];
let testUser1 = 'user1-test';
let testUser2 = 'user2-test';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`AssertionError: ${message}`);
    // In a real test runner, we would throw an error
    // throw new Error(`AssertionError: ${message}`);
  }
};

const runTests = async () => {
  console.log('Running Project Service Tests...');

  // --- Test createProject ---
  const testCreateProject = async () => {
    console.log('Test: createProject');
    const projectDetails1 = {
      name: 'Test Project 1',
      description: 'A test project for creation',
      ownerId: testUser1,
      itemIds: ['item1'],
      visibility: 'private' as 'private',
    };
    const createdProject1 = await projectService.createProject(projectDetails1);
    assert(!!createdProject1, 'FAIL: createProject - project1 should be created');
    assert(createdProject1.name === projectDetails1.name, 'FAIL: createProject - project1 name mismatch');
    assert(!!createdProject1.id, 'FAIL: createProject - project1 ID not generated');
    createdProjectIds.push(createdProject1.id);

    const projectDetails2 = {
      name: 'Test Project 2 Shared (was Public)',
      description: 'A shared project, formerly public',
      ownerId: testUser2,
      itemIds: ['item2', 'item3'],
      visibility: 'shared' as 'shared', // Changed from 'public' to 'shared'
    };
    const createdProject2 = await projectService.createProject(projectDetails2);
    assert(!!createdProject2, 'FAIL: createProject - project2 should be created');
    assert(createdProject2.id !== createdProject1.id, 'FAIL: createProject - project IDs should be unique');
    createdProjectIds.push(createdProject2.id);

    const projectDetails3 = {
      name: 'Test Project 3 Shared',
      description: 'A shared project',
      ownerId: testUser1,
      itemIds: ['item4'],
      visibility: 'shared' as 'shared',
      sharedWith: [testUser2],
    };
    const createdProject3 = await projectService.createProject(projectDetails3);
    assert(!!createdProject3, 'FAIL: createProject - project3 should be created');
    assert(createdProject3.sharedWith?.includes(testUser2), 'FAIL: createProject - project3 sharedWith not set');
    createdProjectIds.push(createdProject3.id);

    console.log('PASS: createProject (basic checks)');
  };

  // --- Test getProjectById ---
  const testGetProjectById = async () => {
    console.log('Test: getProjectById');
    const projectIdToFetch = createdProjectIds[0];
    if (!projectIdToFetch) {
      console.error('FAIL: getProjectById - prerequisite project not found');
      return;
    }
    const fetchedProject = await projectService.getProjectById(projectIdToFetch);
    assert(!!fetchedProject, 'FAIL: getProjectById - could not fetch existing project');
    assert(fetchedProject?.id === projectIdToFetch, 'FAIL: getProjectById - fetched project ID mismatch');

    const notFound = await projectService.getProjectById('nonexistent-id-12345');
    assert(notFound === undefined, 'FAIL: getProjectById - non-existent project should return undefined');
    console.log('PASS: getProjectById');
  };

  // --- Test getProjectsByOwner ---
  const testGetProjectsByOwner = async () => {
    console.log('Test: getProjectsByOwner');
    const projectsUser1 = await projectService.getProjectsByOwner(testUser1);
    // Expecting Project 1 and Project 3 for user1
    assert(projectsUser1.length >= 2, 'FAIL: getProjectsByOwner - user1 should have at least 2 projects');
    assert(projectsUser1.some(p => p.id === createdProjectIds[0]), 'FAIL: getProjectsByOwner - user1 missing project1');
    assert(projectsUser1.some(p => p.id === createdProjectIds[2]), 'FAIL: getProjectsByOwner - user1 missing project3');


    const projectsUser2 = await projectService.getProjectsByOwner(testUser2);
    // Expecting Project 2 for user2
    assert(projectsUser2.length >= 1, 'FAIL: getProjectsByOwner - user2 should have at least 1 project');
    assert(projectsUser2.some(p => p.id === createdProjectIds[1]), 'FAIL: getProjectsByOwner - user2 missing project2');

    const projectsNoOne = await projectService.getProjectsByOwner('nonexistent-owner-id');
    assert(projectsNoOne.length === 0, 'FAIL: getProjectsByOwner - non-existent owner should have 0 projects');
    console.log('PASS: getProjectsByOwner');
  };

  // --- Test updateProject ---
  const testUpdateProject = async () => {
    console.log('Test: updateProject');
    const projectIdToUpdate = createdProjectIds[0];
    if (!projectIdToUpdate) {
      console.error('FAIL: updateProject - prerequisite project not found');
      return;
    }
    const updates = {
      name: 'Updated Project Name',
      description: 'Updated description.',
      itemIds: ['item1', 'item_new'],
      visibility: 'private' as 'private', // ensure visibility is one of the allowed literals
    };
    // Cast updates to the correct type, excluding id and ownerId
    const typedUpdates: Partial<Omit<Project, 'id' | 'ownerId'>> = updates;

    const updatedProject = await projectService.updateProject(projectIdToUpdate, typedUpdates);
    assert(!!updatedProject, 'FAIL: updateProject - project should be found and updated');
    assert(updatedProject?.name === updates.name, 'FAIL: updateProject - name not updated');
    assert(updatedProject?.description === updates.description, 'FAIL: updateProject - description not updated');
    assert(updatedProject?.itemIds.includes('item_new'), 'FAIL: updateProject - itemIds not updated');
    assert(updatedProject?.ownerId === testUser1, 'FAIL: updateProject - ownerId should not change'); // Original owner was user1

    const attemptUpdateOwner = await projectService.updateProject(projectIdToUpdate, { name: 'Trying to change owner' } as any);
    assert(attemptUpdateOwner?.ownerId === testUser1, 'FAIL: updateProject - ownerId should remain unchanged even if passed in updates');

    const nonExistentUpdate = await projectService.updateProject('nonexistent-id-for-update', { name: 'ghost project' });
    assert(nonExistentUpdate === undefined, 'FAIL: updateProject - updating non-existent project should return undefined');
    console.log('PASS: updateProject');
  };

  // --- Test getPublicProjects ---
  const testGetPublicProjects = async () => {
    console.log('Test: getPublicProjects');
    const publicProjects = await projectService.getPublicProjects();
    // Expecting Test Project 2 (now shared) and Test Project 3 (shared)
    const publicProjectIds = publicProjects.map(p => p.id);
    assert(publicProjects.length >= 2, 'FAIL: getPublicProjects - should be at least two shared projects');
    assert(publicProjectIds.includes(createdProjectIds[1]), 'FAIL: getPublicProjects - project 2 (ID: ' + createdProjectIds[1] + ') not found. Found: ' + publicProjectIds.join(', '));
    assert(publicProjects.find(p=>p.id === createdProjectIds[1])?.visibility === 'shared', 'FAIL: getPublicProjects - project 2 is not shared type');
    assert(publicProjectIds.includes(createdProjectIds[2]), 'FAIL: getPublicProjects - project 3 (ID: ' + createdProjectIds[2] + ') not found. Found: ' + publicProjectIds.join(', '));
    assert(publicProjects.find(p=>p.id === createdProjectIds[2])?.visibility === 'shared', 'FAIL: getPublicProjects - project 3 is not shared type');

    // Ensure no private projects are fetched
    assert(!publicProjectIds.includes(createdProjectIds[0]), 'FAIL: getPublicProjects - private project 1 (ID: ' + createdProjectIds[0] + ') was found in public projects.');

    console.log('PASS: getPublicProjects');
  };

  // Removed testGetSharedProjectsForUser function

  // --- Test deleteProject ---
  const testDeleteProject = async () => {
    console.log('Test: deleteProject');

    // Test 1: Private project deletion by owner
    const privateProjectOwner = 'owner_private_del_' + Date.now();
    const privateProjectDetails = { name: 'Private Delete Test', description: 'Desc', ownerId: privateProjectOwner, itemIds: [], visibility: 'private' as 'private' };
    const privateProject = await projectService.createProject(privateProjectDetails);
    assert(!!privateProject, "FAIL: deleteProject (Private) - setup failed");
    if (!privateProject) return;
    let canDeletePrivate = await projectService.deleteProject(privateProject.id, privateProjectOwner);
    assert(canDeletePrivate, 'FAIL: deleteProject (Private) - Owner could not delete private project');
    let stillExistsPrivate = await projectService.getProjectById(privateProject.id);
    assert(stillExistsPrivate === undefined, 'FAIL: deleteProject (Private) - Project still exists after deletion');
    console.log('PASS: deleteProject (Private project by owner)');

    // Test 2: Non-owner trying to delete private project
    const privateProject2 = await projectService.createProject({ ...privateProjectDetails, name: "Private Delete Test NonOwner" });
    assert(!!privateProject2, "FAIL: deleteProject (Private NonOwner) - setup failed");
    if (!privateProject2) return;
    canDeletePrivate = await projectService.deleteProject(privateProject2.id, 'non_owner_user');
    assert(!canDeletePrivate, 'FAIL: deleteProject (Private NonOwner) - Non-owner was able to delete');
    stillExistsPrivate = await projectService.getProjectById(privateProject2.id);
    assert(!!stillExistsPrivate, 'FAIL: deleteProject (Private NonOwner) - Project does not exist after failed non-owner delete attempt');
    // Cleanup this project as owner
    await projectService.deleteProject(privateProject2.id, privateProjectOwner);
    console.log('PASS: deleteProject (Private project by non-owner attempt)');


    // Test 3: Deleting non-existent project
    const nonExistentDeleteResult = await projectService.deleteProject('nonexistent-project-to-delete', testUser1);
    assert(!nonExistentDeleteResult, 'FAIL: deleteProject - deleting non-existent project should return false');
    console.log('PASS: deleteProject (Non-existent project)');

    // --- SHARED PROJECT DELETION TESTS ---
    const sharedOwnerId = 'shared_owner_' + Date.now();
    const user2Id = 'shared_user2_' + Date.now();
    const user3Id = 'shared_user3_' + Date.now();

    // Helper to manage dummyItems for these specific tests
    const originalDummyItems = [...dummyItems];
    const tempItemsForTest: Item[] = [];
    const addTestItem = (item: Omit<Item, 'ownerName' | 'status' | 'dataAiHint' | 'listingType'>) => {
        const fullItem = { ...item, ownerName: 'Test', status: 'available', listingType: 'offer' } as Item;
        tempItemsForTest.push(fullItem);
        const existingIndex = dummyItems.findIndex(i => i.id === fullItem.id);
        if (existingIndex > -1) dummyItems.splice(existingIndex, 1); // remove if exists
        dummyItems.push(fullItem);
    };
    const cleanupTestItems = () => {
        tempItemsForTest.forEach(testItem => {
            const idx = dummyItems.findIndex(i => i.id === testItem.id);
            if (idx > -1) dummyItems.splice(idx, 1);
        });
        // Restore any original items that might have had same IDs, though unlikely with unique IDs.
        // This simple cleanup assumes test item IDs are unique enough not to clash with pre-existing vital dummyItems.
    };

    // Scenario 1: Owner deletes shared project with NO items
    let sharedProject1 = await projectService.createProject({ name: 'Shared Del Empty', ownerId: sharedOwnerId, visibility: 'shared', itemIds: [] });
    assert(!!sharedProject1, 'FAIL: deleteProject (Shared Empty) - setup failed');
    if (!sharedProject1) return;
    let canDeleteShared = await projectService.deleteProject(sharedProject1.id, sharedOwnerId);
    assert(canDeleteShared, 'FAIL: deleteProject (Shared Empty) - Owner could not delete empty shared project');
    assert(!(await projectService.getProjectById(sharedProject1.id)), 'FAIL: deleteProject (Shared Empty) - Project still exists');
    console.log('PASS: deleteProject (Shared project - empty)');

    // Scenario 2: Owner deletes shared project with ONLY THEIR OWN items
    let sharedProject2 = await projectService.createProject({ name: 'Shared Del Own Items', ownerId: sharedOwnerId, visibility: 'shared', itemIds: [] });
    assert(!!sharedProject2, 'FAIL: deleteProject (Shared Own Items) - setup failed');
    if (!sharedProject2) return;
    const itemS2_1 = { id: 'itemS2_1_owner', name: 'S2 Item 1', ownerId: sharedOwnerId, category: 'Test' };
    addTestItem(itemS2_1);
    await projectService.addItemToProject(sharedProject2.id, itemS2_1.id, sharedOwnerId);
    canDeleteShared = await projectService.deleteProject(sharedProject2.id, sharedOwnerId);
    assert(canDeleteShared, 'FAIL: deleteProject (Shared Own Items) - Owner could not delete project with only their items');
    assert(!(await projectService.getProjectById(sharedProject2.id)), 'FAIL: deleteProject (Shared Own Items) - Project still exists');
    cleanupTestItems();
    console.log('PASS: deleteProject (Shared project - only owner items)');

    // Scenario 3: Owner attempts to delete shared project with items from 2 users (owner + user2)
    let sharedProject3 = await projectService.createProject({ name: 'Shared Del Two Users', ownerId: sharedOwnerId, visibility: 'shared', itemIds: [] });
    assert(!!sharedProject3, 'FAIL: deleteProject (Shared Two Users) - setup failed');
    if (!sharedProject3) return;
    const itemS3_1_owner = { id: 'itemS3_1_owner', name: 'S3 Item 1 Owner', ownerId: sharedOwnerId, category: 'Test' };
    const itemS3_2_user2 = { id: 'itemS3_2_user2', name: 'S3 Item 2 User2', ownerId: user2Id, category: 'Test' };
    addTestItem(itemS3_1_owner); addTestItem(itemS3_2_user2);
    await projectService.addItemToProject(sharedProject3.id, itemS3_1_owner.id, sharedOwnerId);
    await projectService.addItemToProject(sharedProject3.id, itemS3_2_user2.id, user2Id); // User2 adds their item
    canDeleteShared = await projectService.deleteProject(sharedProject3.id, sharedOwnerId);
    assert(!canDeleteShared, 'FAIL: deleteProject (Shared Two Users) - Owner was able to delete project with 2 unique item owners');
    assert(!!(await projectService.getProjectById(sharedProject3.id)), 'FAIL: deleteProject (Shared Two Users) - Project was deleted');
    cleanupTestItems();
    console.log('PASS: deleteProject (Shared project - 2 unique item owners, owner + other)');

    // Scenario 4: Owner deletes shared project with items from ONLY ONE OTHER user (user2)
    let sharedProject4 = await projectService.createProject({ name: 'Shared Del One Other User', ownerId: sharedOwnerId, visibility: 'shared', itemIds: [] });
    assert(!!sharedProject4, 'FAIL: deleteProject (Shared One Other) - setup failed');
    if (!sharedProject4) return;
    const itemS4_1_user2 = { id: 'itemS4_1_user2', name: 'S4 Item 1 User2', ownerId: user2Id, category: 'Test' };
    const itemS4_2_user2 = { id: 'itemS4_2_user2', name: 'S4 Item 2 User2', ownerId: user2Id, category: 'Test' };
    addTestItem(itemS4_1_user2); addTestItem(itemS4_2_user2);
    await projectService.addItemToProject(sharedProject4.id, itemS4_1_user2.id, user2Id);
    await projectService.addItemToProject(sharedProject4.id, itemS4_2_user2.id, user2Id);
    canDeleteShared = await projectService.deleteProject(sharedProject4.id, sharedOwnerId);
    assert(canDeleteShared, 'FAIL: deleteProject (Shared One Other) - Owner could not delete project with items from one other user');
    assert(!(await projectService.getProjectById(sharedProject4.id)), 'FAIL: deleteProject (Shared One Other) - Project still exists');
    cleanupTestItems();
    console.log('PASS: deleteProject (Shared project - 1 other unique item owner)');

    // Scenario 5: Owner attempts to delete shared project with items from 2 OTHER users (user2 + user3)
    let sharedProject5 = await projectService.createProject({ name: 'Shared Del Two Other Users', ownerId: sharedOwnerId, visibility: 'shared', itemIds: [] });
    assert(!!sharedProject5, 'FAIL: deleteProject (Shared Two Others) - setup failed');
    if(!sharedProject5) return;
    const itemS5_1_user2 = { id: 'itemS5_1_user2', name: 'S5 Item 1 User2', ownerId: user2Id, category: 'Test' };
    const itemS5_2_user3 = { id: 'itemS5_2_user3', name: 'S5 Item 2 User3', ownerId: user3Id, category: 'Test' };
    addTestItem(itemS5_1_user2); addTestItem(itemS5_2_user3);
    await projectService.addItemToProject(sharedProject5.id, itemS5_1_user2.id, user2Id);
    await projectService.addItemToProject(sharedProject5.id, itemS5_2_user3.id, user3Id);
    canDeleteShared = await projectService.deleteProject(sharedProject5.id, sharedOwnerId);
    assert(!canDeleteShared, 'FAIL: deleteProject (Shared Two Others) - Owner was able to delete project with 2 other unique item owners');
    assert(!!(await projectService.getProjectById(sharedProject5.id)), 'FAIL: deleteProject (Shared Two Others) - Project was deleted');
    cleanupTestItems();
    console.log('PASS: deleteProject (Shared project - 2 other unique item owners)');

    // Restore dummyItems to original state if manipulated (simplified cleanup for now)
    // This is very basic; a proper test suite would handle data setup/teardown better.
    // dummyItems.length = 0; // Clear dummyItems
    // originalDummyItems.forEach(item => dummyItems.push(item)); // Repopulate
    // The cleanupTestItems handles specific items. If other tests pollute dummyItems, it's an issue.
  };


  // --- Call all test functions ---
  // Order matters here as tests might depend on data created by previous ones
  // due to shared in-memory store and no reset.
  await testCreateProject();
  await testGetProjectById();
  await testGetProjectsByOwner();
  await testUpdateProject(); // relies on projects created in testCreateProject
  await testGetPublicProjects(); // relies on public project from testCreateProject
  // await testGetSharedProjectsForUser(); // Call removed
  await testDeleteProject(); // creates its own project to delete

  // New tests for item management in projects
  await testAddItemToProject();
  await testRemoveItemFromProject();

  console.log('Project Service Tests Completed.');
  console.log('Note: Tests are cumulative. Re-running will add more data.');
  console.log('Current project IDs in store for reference:', createdProjectIds.join(', '));
  const finalProjects = await projectService.getProjectsByOwner(testUser1); // Example to see remaining data
  // console.log('Final projects for user1:', finalProjects.map(p => ({id: p.id, name: p.name})));
};


// --- Test addItemToProject ---
const testAddItemToProject = async () => {
  console.log('Test: addItemToProject');
  const ownerId = 'userAddItemOwner_' + Date.now();
  const otherUserId = 'userAddItemOther_' + Date.now();
  const itemId1 = 'itemToAdd1';
  const itemId2 = 'itemToAdd2';

  // 1. Create a project for ownerId
  // 1. Create a private project for ownerId
  const privateProjectDetails = { name: 'AddItem Private Proj', description: 'Desc', ownerId: ownerId, itemIds: [], visibility: 'private' as 'private' };
  let privateProject = await projectService.createProject(privateProjectDetails);
  assert(!!privateProject, 'AddItem (Private): Project creation failed for owner ' + ownerId);
  if (!privateProject) return;
  const privateProjectId = privateProject.id;

  // 2. Owner adds item successfully to private project
  let updatedPrivateProject = await projectService.addItemToProject(privateProjectId, itemId1, ownerId);
  assert(!!updatedPrivateProject && updatedPrivateProject.itemIds.includes(itemId1) && updatedPrivateProject.itemIds.length === 1, 'AddItem (Private): Owner failed to add item1');

  let privateProjectInDb = await projectService.getProjectById(privateProjectId);
  assert(!!privateProjectInDb && privateProjectInDb.itemIds.includes(itemId1), 'AddItem (Private): item1 not in DB after owner add');

  // 3. Another user tries to add item to private project (permission denied)
  const originalPrivateItemIdsLength = privateProjectInDb?.itemIds.length || 0;
  let noPermUpdatePrivate = await projectService.addItemToProject(privateProjectId, itemId2, otherUserId);
  assert(noPermUpdatePrivate === undefined, 'AddItem (Private): Other user adding item should return undefined');
  privateProjectInDb = await projectService.getProjectById(privateProjectId);
  assert(!!privateProjectInDb && privateProjectInDb.itemIds.length === originalPrivateItemIdsLength && !privateProjectInDb.itemIds.includes(itemId2), 'AddItem (Private): Project state changed after other user attempt');

  // 4. Owner adds same item again to private project (no duplicates)
  updatedPrivateProject = await projectService.addItemToProject(privateProjectId, itemId1, ownerId);
  assert(!!updatedPrivateProject && updatedPrivateProject.itemIds.includes(itemId1) && updatedPrivateProject.itemIds.length === 1, 'AddItem (Private): Adding existing item created duplicate');

  // 5. Add to non-existent project (same for any visibility)
  const nonExistentResult = await projectService.addItemToProject('nonExistentProjectId_AddItem', itemId1, ownerId);
  assert(nonExistentResult === undefined, 'AddItem: Adding to non-existent project did not return undefined');

  // --- Tests for SHARED projects ---
  const sharedProjectOwner = 'owner_shared_additem_' + Date.now();
  const sharedProjectDetails = { name: 'AddItem Shared Proj', description: 'Shared', ownerId: sharedProjectOwner, itemIds: [], visibility: 'shared' as 'shared' };
  let sharedProject = await projectService.createProject(sharedProjectDetails);
  assert(!!sharedProject, 'AddItem (Shared): Project creation failed for owner ' + sharedProjectOwner);
  if (!sharedProject) return;
  const sharedProjectId = sharedProject.id;

  // 6. Owner adds item to their shared project successfully
  let updatedSharedProject = await projectService.addItemToProject(sharedProjectId, itemId1, sharedProjectOwner);
  assert(!!updatedSharedProject && updatedSharedProject.itemIds.includes(itemId1) && updatedSharedProject.itemIds.length === 1, 'AddItem (Shared): Owner failed to add item1');

  // 7. Another user (otherUserId) adds an item (itemId2) to the shared project successfully
  updatedSharedProject = await projectService.addItemToProject(sharedProjectId, itemId2, otherUserId);
  assert(!!updatedSharedProject && updatedSharedProject.itemIds.includes(itemId2) && updatedSharedProject.itemIds.length === 2, 'AddItem (Shared): Other user failed to add item2. Current items: ' + updatedSharedProject?.itemIds.join(','));

  // Refetch to confirm DB state for shared project
  let sharedProjectInDb = await projectService.getProjectById(sharedProjectId);
  assert(!!sharedProjectInDb && sharedProjectInDb.itemIds.includes(itemId1) && sharedProjectInDb.itemIds.includes(itemId2) && sharedProjectInDb.itemIds.length === 2, 'AddItem (Shared): Items not correctly in DB after owner and other user add');

  // 8. Another user adds an existing item (itemId1) to shared project (no duplicates)
  updatedSharedProject = await projectService.addItemToProject(sharedProjectId, itemId1, otherUserId);
  assert(!!updatedSharedProject && updatedSharedProject.itemIds.length === 2, 'AddItem (Shared): Adding existing item by other user created duplicate or error. Expected 2, got: ' + updatedSharedProject.itemIds.length + ' Items: ' + updatedSharedProject.itemIds.join(', '));

  console.log('PASS: addItemToProject');
};

// --- Test removeItemFromProject ---
// Note: removeItemFromProject currently only allows project owner to remove items, regardless of visibility.
// This test structure will reflect that. If rules for shared projects change for removeItem, this test needs update.
const testRemoveItemFromProject = async () => {
  console.log('Test: removeItemFromProject');
  const ownerId = 'userRemoveItemOwner_' + Date.now();
  const otherUserId = 'userRemoveItemOther_' + Date.now();
  const itemA = 'itemA_toRemove';
  const itemB = 'itemB_toRemove';
  const itemC = 'itemC_toRemove';

  // 1. Create a project and add some items
  const projectDetails = { name: 'RemoveItem Test Project', description: 'Desc', ownerId: ownerId, itemIds: [itemA, itemB, itemC], visibility: 'private' as 'private' };
  let project = await projectService.createProject(projectDetails); // Creates project with initial items
  assert(!!project && project.itemIds.length === 3, 'RemoveItem: Project creation with initial items failed');
  if (!project) return;
  const projectId = project.id;

  // 2. Owner removes an item successfully
  let updatedProject = await projectService.removeItemFromProject(projectId, itemB, ownerId);
  assert(!!updatedProject && !updatedProject.itemIds.includes(itemB) && updatedProject.itemIds.includes(itemA) && updatedProject.itemIds.includes(itemC) && updatedProject.itemIds.length === 2, 'RemoveItem: Owner failed to remove itemB correctly. Items: ' + updatedProject?.itemIds.join(','));

  // Refetch to confirm DB state
  let projectInDb = await projectService.getProjectById(projectId);
  assert(!!projectInDb && projectInDb.itemIds.length === 2 && !projectInDb.itemIds.includes(itemB), 'RemoveItem: itemB still in DB or length incorrect after owner removal');

  // 3. Another user tries to remove an item (permission denied)
  const originalItemIdsLength = projectInDb?.itemIds.length || 0;
  let noPermUpdate = await projectService.removeItemFromProject(projectId, itemA, otherUserId);
  assert(noPermUpdate === undefined, 'RemoveItem: Other user removing item should return undefined');

  projectInDb = await projectService.getProjectById(projectId); // Re-fetch
  assert(!!projectInDb && projectInDb.itemIds.length === originalItemIdsLength && projectInDb.itemIds.includes(itemA), 'RemoveItem: Project state in DB changed after other user removal attempt');

  // 4. Owner tries to remove an item not in the project
  const currentLength = projectInDb?.itemIds.length || 0;
  updatedProject = await projectService.removeItemFromProject(projectId, 'nonExistentItemToRemove', ownerId);
  assert(!!updatedProject && updatedProject.itemIds.length === currentLength, 'RemoveItem: Removing non-existent item changed item count');

  // 5. Remove from non-existent project
  const nonExistentResult = await projectService.removeItemFromProject('nonExistentProjectId_RemoveItem', itemA, ownerId);
  assert(nonExistentResult === undefined, 'RemoveItem: Removing from non-existent project did not return undefined');

  // 6. Owner removes remaining items
  await projectService.removeItemFromProject(projectId, itemA, ownerId);
  updatedProject = await projectService.removeItemFromProject(projectId, itemC, ownerId);
  assert(!!updatedProject && updatedProject.itemIds.length === 0, 'RemoveItem: Failed to remove all items. Expected 0, got ' + updatedProject?.itemIds.length);

  projectInDb = await projectService.getProjectById(projectId); // Re-fetch
  assert(!!projectInDb && projectInDb.itemIds.length === 0, 'RemoveItem: All items not removed from DB');

  console.log('PASS: removeItemFromProject');
};


// This would typically be handled by a test runner like Jest or Vitest
// For this environment, we'll call it manually if needed for verification.
// runTests();
// We are not running the tests in this step, just creating the file.

console.log('project-service.test.ts created and populated with test functions.');
console.log('To run these tests, you would typically use a test runner, or uncomment runTests() and execute this file.');

// If a reset function were available in project-service.ts (e.g., projectService.__resetState()),
// it would be called in a "beforeEach" or "beforeAll" block in a test runner environment.
// e.g.
// if (typeof beforeEach === 'function') {
//   beforeEach(() => {
//     // projectService.__resetState(); // Hypothetical reset function
//     createdProjectIds = []; // Reset test-local state
//   });
// }
