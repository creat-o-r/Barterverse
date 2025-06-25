
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added Dialog
// Input is already imported from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { Label } from '@/components/ui/label'; // Added Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select
import { Send, User, Bot, Loader2, ListChecks, Package, Tag, ImageIcon, PlusSquare, Briefcase } from 'lucide-react'; // Added PlusSquare, Briefcase
import Image from 'next/image';
import type { Item, ChatMessage, Project } from '@/types'; // Added Project type
import { createProject, getProjectsByOwner } from '@/services/project-service'; // Added getProjectsByOwner
import { generalChat } from '@/ai/flows/general-chat-flow';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // Added Collapsible
import { useMemo } from 'react'; // Added useMemo
import { useToast } from "@/hooks/use-toast";
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function QuickListPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userListings, setUserListings] = useState<Item[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const currentUserId = dummyUsers[0].id; // Simulate current user

  // State for user's projects for grouping
  const [userProjectsState, setUserProjectsState] = useState<Project[]>([]);
  const [isLoadingProjectsForGrouping, setIsLoadingProjectsForGrouping] = useState(true);

  // States for Save Chat as Project Modal
  const [showSaveAsProjectModal, setShowSaveAsProjectModal] = useState(false);
  const [projectChatName, setProjectChatName] = useState('');
  const [projectChatDescription, setProjectChatDescription] = useState('');
  const [projectChatVisibility, setProjectChatVisibility] = useState<'public' | 'private' | 'shared'>('private');

  useEffect(() => {
    setIsLoadingListings(true);
    const listings = dummyItems.filter(item => item.ownerId === currentUserId && (item.status === 'available' || item.status === 'pending'));
    setUserListings(listings);
    setIsLoadingListings(false);

    if (currentUserId) {
      setIsLoadingProjectsForGrouping(true);
      getProjectsByOwner(currentUserId)
        .then(projects => {
          setUserProjectsState(projects);
        })
        .catch(err => {
          console.error("Failed to fetch projects for grouping:", err);
          toast({ title: "Error", description: "Could not load projects for grouping listings.", variant: "default" });
        })
        .finally(() => setIsLoadingProjectsForGrouping(false));
    } else {
      setIsLoadingProjectsForGrouping(false);
      setUserProjectsState([]);
    }

    setMessages([
      {
        id: 'initial-quicklist-ai-message',
        senderId: 'llm',
        text: "Welcome to Quick List! Describe the items you want to list (e.g., 'List a red bike, good condition, for trade' or 'I want to sell three vintage t-shirts').\n\n(Note: Currently, I can chat but can't actually create listings yet. This is a preview of the Quick List feature!)",
        timestamp: new Date(),
        isAIMessage: true,
      },
    ]);
  }, [currentUserId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId,
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const chatHistoryForFlow = messages
        .map(msg => `${msg.isAIMessage ? 'AI' : 'User'}: ${msg.text}`)
        .join('\n');
      
      const aiResponse = await generalChat({
        chatHistory: chatHistoryForFlow + `\nUser: ${userMessage.text}`, // Append current message for context
        userMessage: userMessage.text,
      });

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        senderId: 'llm',
        text: aiResponse.response,
        timestamp: new Date(),
        isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error calling general AI chat:', error);
      toast({
        title: "Chat Error",
        description: "Could not get a response from the assistant. Please try again.",
        variant: "destructive",
      });
       const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-err',
        senderId: 'llm',
        text: "Sorry, I couldn't connect to the AI. Please try again.",
        timestamp: new Date(),
        isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedUserListings = useMemo(() => {
    if (isLoadingProjectsForGrouping || isLoadingListings) return [];

    const groups: Array<{ project: Project | null; name: string; items: Item[]; id: string; }> = [];
    const itemIdsInProjects = new Set<string>();

    userProjectsState.forEach(proj => {
      const itemsInProject = userListings.filter(item => proj.itemIds && proj.itemIds.includes(item.id));
      // Only add project group if it has items from current listings OR if we want to show all projects
      // For this view, let's only show projects that have some of the userListings in them
      // Or always show project, and then list items if any.
      // Let's go with always show project, and list items if any.
      groups.push({ project: proj, name: proj.name, items: itemsInProject, id: proj.id });
      itemsInProject.forEach(item => itemIdsInProjects.add(item.id));
    });

    const unassignedItems = userListings.filter(item => !itemIdsInProjects.has(item.id));
    if (unassignedItems.length > 0) {
      groups.push({ project: null, name: "Unassigned Items", items: unassignedItems, id: "unassigned-group" });
    }

    // Ensure all projects are listed, even if empty of current items, and sort them
    userProjectsState.forEach(proj => {
        if (!groups.find(g => g.project?.id === proj.id)) {
            groups.push({ project: proj, name: proj.name, items: [], id: proj.id });
        }
    });

    // Remove duplicates that might arise if a project was added via items, then again as an empty project
    const uniqueGroups = Array.from(new Map(groups.map(group => [group.id, group])).values());


    return uniqueGroups.sort((a,b) => {
        if (a.project && !b.project) return -1; // Projects first
        if (!a.project && b.project) return 1; // Unassigned last
        if (a.project && b.project) return a.name.localeCompare(b.name); // Sort projects by name
        return 0; // Should not happen if IDs are unique
    });

  }, [userListings, userProjectsState, isLoadingProjectsForGrouping, isLoadingListings]);

  const handleSaveChatAsProject = async () => {
    if (!projectChatName.trim() || !currentUserId) {
      toast({ title: "Validation Error", description: "Project name is required.", variant: "destructive" });
      return;
    }
    try {
      const projectData: Omit<Project, 'id'> = {
        name: projectChatName,
        description: projectChatDescription,
        ownerId: currentUserId,
        itemIds: [], // Initially empty
        visibility: projectChatVisibility,
      };
      if (projectChatVisibility === 'shared') {
        projectData.sharedWith = [];
      }

      const newProject = await createProject(projectData);
      toast({ title: "Project Created", description: `'${newProject.name}' was successfully created from your chat session.` });
      setShowSaveAsProjectModal(false);
      setProjectChatName('');
      setProjectChatDescription('');
      setProjectChatVisibility('private');
    } catch (error) {
      console.error("Error creating project from chat:", error);
      toast({ title: "Creation Failed", description: "Could not create the project. Please try again.", variant: "destructive" });
    }
  };

  return (
    <> {/* Added React Fragment */}
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh_-_8rem)]"> {/* Adjust height based on actual nav/footer */}
      {/* Chat Area */}
      <Card className="flex-grow md:flex-grow-[2] flex flex-col h-full">
        <CardHeader className="pb-3 flex flex-row items-start justify-between">
          <div> {/* Wrapper for title and description */}
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <ListChecks className="h-7 w-7 text-primary" />
              Quick List Chat
            </CardTitle>
            <CardDescription className="font-body mt-1">
              Chat with the AI to list your items quickly. Describe what you have, and the AI will help (soon!).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSaveAsProjectModal(true)} className="flex-shrink-0 ml-4">
            <PlusSquare className="mr-2 h-4 w-4" /> Save Chat as Project
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-end gap-2 mb-4',
                  message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                )}
              >
                {message.senderId !== currentUserId && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[70%] p-3 rounded-lg text-sm font-body',
                    message.senderId === currentUserId
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-muted-foreground rounded-bl-none'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                   <p className={cn(
                    "text-xs mt-1",
                    message.senderId === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
                    message.senderId === currentUserId ? 'text-right' : 'text-left'
                  )}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.senderId === currentUserId && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={dummyUsers.find(u=>u.id === currentUserId)?.avatarUrl} />
                    <AvatarFallback>{dummyUsers.find(u=>u.id === currentUserId)?.name.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 mb-4 justify-start">
                <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-3 rounded-lg text-sm font-body bg-muted text-muted-foreground rounded-bl-none">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex items-center p-3 border-t bg-background">
            <Input
              type="text"
              placeholder="e.g., 'List 3 books and a blue bicycle for trade...'"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow mr-2"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User's Listings Area */}
      <Card className="md:flex-grow-[1] flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Package className="h-6 w-6 text-accent" />
            Your Current Listings
          </CardTitle>
           <CardDescription className="font-body text-xs">
            Items you are offering or want.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {isLoadingListings || isLoadingProjectsForGrouping ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userListings.length === 0 ? (
              <p className="text-center text-muted-foreground font-body py-10">You have no active listings.</p>
            ) : groupedUserListings.length === 0 && userListings.length > 0 ? (
               // This case means all items are unassigned and the unassigned group is the only one.
               // Or if logic changes, this could be a fallback. For now, let's assume unassigned group always appears if items exist.
              <div className="space-y-3">
                <h4 className="text-md font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" /> Unassigned Items ({userListings.length})
                </h4>
                {userListings.map(item => (
                  <div key={item.id} className="p-2 border rounded-md bg-background hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-2">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.imageUrl ? ( <Image src={item.imageUrl} alt={item.name} fill className="object-cover" data-ai-hint={item.dataAiHint || "item image"} /> ) : ( <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-5 h-5" /></div> )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <Link href={`/items/${item.id}`} className="hover:text-primary"><h5 className="text-xs font-semibold truncate font-headline" title={item.name}>{item.name}</h5></Link>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Tag className="h-3 w-3 shrink-0" /> {item.category}</p>
                        <Badge variant={item.listingType === 'offer' ? 'default' : 'secondary'} className="text-[10px] mt-1 capitalize px-1.5 py-0.5">{item.listingType}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {groupedUserListings.map((group) => (
                  <Collapsible key={group.id} defaultOpen={true} className="rounded-md border overflow-hidden">
                    <CollapsibleTrigger className="w-full bg-muted/50 hover:bg-muted/80 transition-colors p-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          {group.project ? <Briefcase className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                          {group.name} ({group.items.length})
                        </h4>
                        {/* Add Chevron from lucide if desired for open/close state indication */}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 pb-1 px-2 space-y-2 bg-background">
                      {group.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-1 py-1">No items from your current listings in this project.</p>
                      ) : (
                        group.items.map(item => (
                          <div key={item.id} className="p-1.5 border rounded-md bg-muted/20 hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-2">
                              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                                {item.imageUrl ? ( <Image src={item.imageUrl} alt={item.name} fill className="object-cover" data-ai-hint={item.dataAiHint || "item image"} /> ) : ( <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-4 h-4" /></div> )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <Link href={`/items/${item.id}`} className="hover:text-primary"><h5 className="text-xs font-semibold truncate font-headline" title={item.name}>{item.name}</h5></Link>
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Tag className="h-3 w-3 shrink-0" /> {item.category}</p>
                                <Badge variant={item.listingType === 'offer' ? 'default' : 'secondary'} className="text-[9px] mt-0.5 capitalize px-1 py-0"> {item.listingType} </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>

    {/* Modal for Saving Chat as Project */}
    {showSaveAsProjectModal && (
      <Dialog open={showSaveAsProjectModal} onOpenChange={setShowSaveAsProjectModal}>
        <DialogContent className="sm:max-w-[480px] bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline">Save Chat Session as Project</DialogTitle>
            <DialogDescription className="font-body">
              Create a new project based on this chat. You can add specific items later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectChatName" className="text-right font-body">Name</Label>
              <Input id="projectChatName" value={projectChatName} onChange={(e) => setProjectChatName(e.target.value)} className="col-span-3 font-body" placeholder="Project Name" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectChatDescription" className="text-right font-body">Description</Label>
              <Textarea id="projectChatDescription" value={projectChatDescription} onChange={(e) => setProjectChatDescription(e.target.value)} className="col-span-3 font-body" placeholder="Brief description (e.g., context of chat)" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectChatVisibility" className="text-right font-body">Visibility</Label>
              <Select value={projectChatVisibility} onValueChange={(value: 'public' | 'private' | 'shared') => setProjectChatVisibility(value)}>
                <SelectTrigger className="col-span-3 font-body">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private" className="font-body">Private</SelectItem>
                  <SelectItem value="public" className="font-body">Public</SelectItem>
                  <SelectItem value="shared" className="font-body">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsProjectModal(false)} className="font-body">Cancel</Button>
            <Button onClick={handleSaveChatAsProject} disabled={!projectChatName.trim()} className="font-body">Save Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
