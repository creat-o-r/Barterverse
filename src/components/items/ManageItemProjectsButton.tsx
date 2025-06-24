'use client';

import { useState, useEffect } from 'react';
import type { Item, Project } from '@/types';
import { getProjectsByOwner, createProject, addItemToProject, removeItemFromProject, getPublicProjects } from '@/services/project-service'; // Added getPublicProjects
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Removed SelectGroup, SelectLabel as they are for Select context
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, CheckCircle, XCircle, Loader2, FolderPlus, ListPlus, Briefcase, PackageIcon } from 'lucide-react'; // Added Briefcase, PackageIcon (alias for Package)

interface ManageItemProjectsButtonProps {
  item: Item;
  isOwner: boolean;
  currentUserId: string; // This is the ID of the logged-in user
}

export default function ManageItemProjectsButton({ item, isOwner, currentUserId }: ManageItemProjectsButtonProps) {
  const [showManageModal, setShowManageModal] = useState(false);
  // State for categorized projects
  const [myPrivateProjects, setMyPrivateProjects] = useState<Project[]>([]);
  const [allSharedProjects, setAllSharedProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectVisibility, setNewProjectVisibility] = useState<'private' | 'shared'>('private'); // Updated type
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (isOwner && currentUserId && showManageModal) {
      setLoadingProjects(true);
      Promise.all([
        getProjectsByOwner(currentUserId),
        getPublicProjects()
      ]).then(([ownedProjects, publicAndSharedProjects]) => {
        setMyPrivateProjects(ownedProjects.filter(p => p.visibility === 'private'));
        // All shared projects, regardless of owner.
        // Filter out any private projects that might have slipped through getPublicProjects if its logic changes.
        // Also, ensure we don't show the same project instance in both lists if one of "my private projects" was also "shared" (not possible with current types).
        const sharedOnly = publicAndSharedProjects.filter(p => p.visibility === 'shared');
        setAllSharedProjects(sharedOnly);

      }).catch(err => {
        console.error("Failed to fetch projects:", err);
        toast({ title: "Error", description: "Could not load projects.", variant: "destructive" });
      }).finally(() => setLoadingProjects(false));
    }
  }, [isOwner, currentUserId, showManageModal, toast]);

  const handleAddItem = async (projectId: string) => {
    try {
      const updatedProject = await addItemToProject(projectId, item.id, currentUserId); // currentUserId is the one performing the action
      if (updatedProject) {
        // Update the correct list
        if (updatedProject.visibility === 'private') {
          setMyPrivateProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        } else { // shared
          setAllSharedProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        }
        toast({ title: "Success", description: `Item added to project '${updatedProject.name}'.` });
      } else {
        // This case might happen if permission was denied by the service for a private project not owned by currentUserId,
        // or if project visibility was neither 'private' nor 'shared'.
        const projectBeingUpdated = myPrivateProjects.find(p=>p.id === projectId) || allSharedProjects.find(p=>p.id === projectId);
        if (projectBeingUpdated?.visibility === 'private' && projectBeingUpdated?.ownerId !== currentUserId) {
             toast({ title: "Permission Denied", description: "You can only add items to your own private projects.", variant: "destructive" });
        } else {
            throw new Error("Failed to add item to project, undefined response from service.");
        }
      }
    } catch (error) {
      console.error("Error adding item to project:", error);
      toast({ title: "Error", description: "Could not add item to project.", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (projectId: string) => {
    try {
      const updatedProject = await removeItemFromProject(projectId, item.id, currentUserId); // currentUserId is the one performing the action
      if (updatedProject) {
         // Update the correct list
        if (updatedProject.visibility === 'private') {
          setMyPrivateProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        } else { // shared
          setAllSharedProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        }
        toast({ title: "Success", description: `Item removed from project '${updatedProject.name}'.` });
      } else {
        // This case implies permission denied by the service (e.g., not project owner)
        // Or project/item not found by service, which should be handled by service logs.
        // For UI, a generic error or a specific one if we can infer it.
        const projectBeingUpdated = myPrivateProjects.find(p=>p.id === projectId) || allSharedProjects.find(p=>p.id === projectId);
        if (projectBeingUpdated?.ownerId !== currentUserId) {
             toast({ title: "Permission Denied", description: "You can only remove items from projects you own.", variant: "destructive" });
        } else {
            throw new Error("Failed to remove item from project, undefined response from service.");
        }
      }
    } catch (error) {
      console.error("Error removing item from project:", error);
      toast({ title: "Error", description: "Could not remove item from project.", variant: "destructive" });
    }
  };

  const handleSaveNewProjectAndAddItem = async () => {
    if (!newProjectName.trim()) {
      toast({ title: "Validation Error", description: "Project name is required.", variant: "destructive" });
      return;
    }
    setIsCreatingProject(true);
    try {
      const projectData: Omit<Project, 'id'> = {
        name: newProjectName,
        description: `Project created for item: ${item.name}`, // Optional: auto-description
        ownerId: currentUserId,
        itemIds: [], // Will add item next
        visibility: newProjectVisibility,
      };
      if (newProjectVisibility === 'shared') projectData.sharedWith = [];

      const newProj = await createProject(projectData);
      // Add to the correct list based on visibility
      if (newProj.visibility === 'private') {
        setMyPrivateProjects(prev => [newProj, ...prev].sort((a,b)=>a.name.localeCompare(b.name)));
      } else { // shared
        setAllSharedProjects(prev => [newProj, ...prev].sort((a,b)=>a.name.localeCompare(b.name)));
      }

      // Now add the current item to this new project
      const finalProjectWithItem = await addItemToProject(newProj.id, item.id, currentUserId); // currentUserId is owner of new project
      if (finalProjectWithItem) {
        if (finalProjectWithItem.visibility === 'private') {
            setMyPrivateProjects(prev => prev.map(p => p.id === newProj.id ? finalProjectWithItem : p));
        } else {
            setAllSharedProjects(prev => prev.map(p => p.id === newProj.id ? finalProjectWithItem : p));
        }
        toast({ title: "Project Created & Item Added", description: `'${item.name}' added to new project '${finalProjectWithItem.name}'.` });
      } else {
        // If adding item failed, the project was still created. User might need to add manually.
        toast({ title: "Project Created", description: `Project '${newProj.name}' created, but failed to add item automatically.`, variant: "default"});
      }

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectVisibility('private');
    } catch (error) {
      console.error("Error creating new project and adding item:", error);
      toast({ title: "Error", description: "Could not create project or add item.", variant: "destructive" });
    } finally {
      setIsCreatingProject(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setShowManageModal(true)} variant="outline" size="sm" className="mt-4 w-full md:w-auto">
        <ListPlus className="mr-2 h-4 w-4" /> Manage Project Memberships
      </Button>

      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">Manage Project Memberships</DialogTitle>
            <DialogDescription className="font-body">
              Add or remove &quot;{item.name}&quot; from your projects.
            </DialogDescription>
          </DialogHeader>
          {loadingProjects ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="max-h-[300px] pr-3">
              <div className="space-y-3 py-2">
                {myPrivateProjects.length === 0 && allSharedProjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No projects available to add this item to.</p>
                )}

                {myPrivateProjects.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-muted-foreground px-1 py-1.5 flex items-center">
                      <Briefcase className="mr-2 h-4 w-4" /> My Private Projects
                    </h5>
                    <div className="space-y-1 pl-2 pr-1">
                      {myPrivateProjects.map(project => {
                        const itemIsInProject = project.itemIds?.includes(item.id);
                        return (
                          <div key={project.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/20">
                            <span className="text-sm font-medium truncate pr-2" title={project.name}>{project.name}</span>
                            {itemIsInProject ? (
                              <Button variant="outline" size="xs" onClick={() => handleRemoveItem(project.id)} title="Remove from this project">
                                <XCircle className="mr-1.5 h-3.5 w-3.5 text-red-500" /> Remove
                              </Button>
                            ) : (
                              <Button variant="outline" size="xs" onClick={() => handleAddItem(project.id)} title="Add to this project">
                                <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-500" /> Add
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allSharedProjects.length > 0 && (
                  <div>
                     {myPrivateProjects.length > 0 && <Separator className="my-3" />}
                    <h5 className="text-sm font-semibold text-muted-foreground px-1 py-1.5 flex items-center">
                       <PackageIcon className="mr-2 h-4 w-4" /> All Shared Projects
                    </h5>
                    <div className="space-y-1 pl-2 pr-1">
                      {allSharedProjects.map(project => {
                        const itemIsInProject = project.itemIds?.includes(item.id);
                        const canRemoveThisItem = project.ownerId === currentUserId;
                        return (
                          <div key={project.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/20">
                            <span className="text-sm font-medium truncate pr-2" title={project.name}>{project.name}</span>
                            <div className="flex gap-1">
                              {itemIsInProject ? (
                                <Button variant="outline" size="xs" onClick={() => handleRemoveItem(project.id)} title={canRemoveThisItem ? "Remove from this project" : "Only project owner can remove items"} disabled={!canRemoveThisItem}>
                                  <XCircle className="mr-1.5 h-3.5 w-3.5 text-red-500" /> Remove
                                </Button>
                              ) : (
                                <Button variant="outline" size="xs" onClick={() => handleAddItem(project.id)} title="Add to this project">
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-500" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowCreateModal(true); }} className="w-full sm:w-auto">
              <FolderPlus className="mr-2 h-4 w-4" /> Create New Project & Add Item
            </Button>
            <Button variant="default" onClick={() => setShowManageModal(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Modal for Creating New Project */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Project</DialogTitle>
            <DialogDescription className="font-body">
              Create a new project and add &quot;{item.name}&quot; to it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="newProjectNameForItemModal" className="font-body">Project Name</Label>
              <Input
                id="newProjectNameForItemModal"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="font-body"
                placeholder="e.g., Summer Collection"
                disabled={isCreatingProject}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newProjectVisibilityForItemModal" className="font-body">Visibility</Label>
              <Select value={newProjectVisibility} onValueChange={(value: 'private' | 'shared') => setNewProjectVisibility(value)} disabled={isCreatingProject}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private" className="font-body">Private (Only you can add items; only you can see)</SelectItem>
                  <SelectItem value="shared" className="font-body">Shared (Anyone can add items; everyone can see)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreatingProject}>Cancel</Button>
            <Button onClick={handleSaveNewProjectAndAddItem} disabled={!newProjectName.trim() || isCreatingProject}>
              {isCreatingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
