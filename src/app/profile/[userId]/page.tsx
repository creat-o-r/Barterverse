
"use client";

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { dummyUsers, dummyItems, updateUserPreferencesInDummyData } from '@/lib/dummy-data';
import type { User, Item, UserMotivation, TradeTimingPreference, UserProfilePreferences as UserProfilePreferencesType, InferredUserPreferences, ItemDeliveryMethod, Project } from '@/types'; // Added Project
import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { getEnableAutomaticPreferenceInference } from '@/services/ai-config-service';
import { getProjectsByOwner, createProject, updateProject, deleteProject } from '@/services/project-service'; // Removed getSharedProjectsForUser
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import ProjectCard from '@/components/projects/ProjectCard'; // Added ProjectCard
import ProjectDetails from '@/components/projects/ProjectDetails'; // Added ProjectDetails
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added Dialog components
import { Input } from '@/components/ui/input'; // Added Input
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { Label } from '@/components/ui/label'; // Added Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select components
import { Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Lightbulb, Wand2, Loader2, FileText, ChevronDown, ChevronUp, Filter, Truck, Home, Briefcase, PlusCircle, Trash2 } from 'lucide-react'; // Added PlusCircle, Trash2
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


async function getUserProfile(userId: string): Promise<User | null> {
  const actualUserId = userId === 'me' ? dummyUsers[0].id : userId;
  let user = dummyUsers.find((u) => u.id === actualUserId);
  if (!user) return null;
  
  if (user.minimumMatchRating === undefined) {
    user.minimumMatchRating = 'Low';
  }
  if (user.logisticsPreferences && !user.logisticsPreferences.defaultDeliveryMethods) {
    user.logisticsPreferences.defaultDeliveryMethods = ['pickup_only'];
  }


  const userItemsFromGlobal = dummyItems.filter(item => item.ownerId === user.id);
  return JSON.parse(JSON.stringify({...user, items: userItemsFromGlobal}));
}

const motivationTextMap: Record<UserMotivation, string> = { 'help-others': 'Helping Others', 'maximize-trades': 'Maximizing Trades', 'convenience-focused': 'Convenience', 'community-building': 'Community Building', 'unique-finds': 'Finding Unique Items', };
const tradeTimingTextMap: Record<TradeTimingPreference, string> = { 'simultaneous': 'Prefers Simultaneous', 'staged': 'Open to Staged Trades', 'flexible': 'Flexible Timing', };

const deliveryMethodDisplayMapConcrete: Record<ItemDeliveryMethod, string> = {
  pickup_only: "Pickup",
  willing_to_ship: "Willing to Ship",
  delivery_area: "Delivery Area",
  possible_delivery: "Possible Delivery",
  public_meetup: "Public Meetup",
  flexible_meetup: "Flexible Meetup",
};

const getThirdPartyFulfillmentSimpleText = (interested?: boolean): string => {
    if (interested === true) return "Open to it";
    if (interested === false) return "Prefers direct trades";
    return "Not Specified";
};

const getChainDeliveryBadgeText = (openToChain?: boolean): string | null => {
    if (openToChain === true) return "Chain Delivery";
    return null;
};


const preparePreferenceInferenceInput = (user: User | null): InferUserPreferencesInput | null => {
  if (!user) return null;

  const userListedItems = dummyItems
    .filter(i => i.ownerId === user.id && (i.status === 'available' || i.status === 'pending'))
    .slice(0, 5) 
    .map(item => ({
      name: item.name,
      description: item.description.substring(0,100) + (item.description.length > 100 ? "..." : ""),
      category: item.category,
      listingType: item.listingType,
    }));

  const currentPrefs: UserProfilePreferencesType = { 
    motivations: user.motivations,
    locationPreference: user.locationPreference,
    tradeTimingPreference: user.tradeTimingPreference,
    interestedInThirdPartyFulfillment: user.interestedInThirdPartyFulfillment,
    minimumMatchRating: user.minimumMatchRating,
  };
  
  const engagementNotes: string[] = [];
  if (user.tradesCompleted > 10) engagementNotes.push("Experienced trader with significant trade history.");
  else if (user.tradesCompleted < 2) engagementNotes.push("Relatively new trader or infrequent activity.");

  if (user.items.filter(i => i.listingType === 'want').length > user.items.filter(i => i.listingType === 'offer').length * 2) {
    engagementNotes.push("Primarily lists 'want' items, often seeking specific things.");
  } else if (user.items.filter(i => i.listingType === 'offer').length > user.items.filter(i => i.listingType === 'want').length * 2) {
    engagementNotes.push("Primarily lists 'offer' items, actively looking to trade away possessions.");
  }
  
  const simulatedChatSnippets: string[] = [];
  if (user.motivations?.includes('convenience-focused')) simulatedChatSnippets.push("Is local pickup an option? That'd be easiest.");
  if (user.motivations?.includes('maximize-trades')) simulatedChatSnippets.push("What's the condition like? I'm looking for items in very good shape.");
  if (user.motivations?.includes('unique-finds')) simulatedChatSnippets.push("This is exactly the rare piece I've been searching for!");
  if (user.motivations?.includes('community-building')) simulatedChatSnippets.push("Thanks for the chat! Always nice to connect with other traders.");
  if (user.minimumMatchRating === 'High') simulatedChatSnippets.push("Only looking for high-quality matches, please.");
  if (simulatedChatSnippets.length === 0) simulatedChatSnippets.push("Open to discussing details further.");


  return {
    userId: user.id,
    listedItems: userListedItems,
    currentPreferences: currentPrefs,
    simulatedChatSnippets,
    engagementNotes,
    tradesCompleted: user.tradesCompleted,
  };
};


const RatingStarsDisplay = ({ score, count }: { score: number, count?: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => ( <Star key={i} className={`h-5 w-5 ${i < Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /> ))}
    <span className="ml-2 text-sm text-muted-foreground">{score.toFixed(1)} {count ? `(${count} ratings)` : ''}</span>
  </div>
);


export default function UserProfilePage({ params: paramsProp }: { params: { userId: string } }) {
  const resolvedParams = use(paramsProp); 
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowAutoPreferenceInference, setAllowAutoPreferenceInference] = useState(false);
  const [isLearningPreferences, setIsLearningPreferences] = useState(false);
  const [showActivityForAI, setShowActivityForAI] = useState(false);
  const [activityInputForAI, setActivityInputForAI] = useState<InferUserPreferencesInput | null>(null);
  const { toast } = useToast();

  // Project states
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Create Project Modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectVisibility, setNewProjectVisibility] = useState<'private' | 'shared'>('private'); // Updated type

  // Edit Project Modal states
  const [isEditingSelectedProject, setIsEditingSelectedProject] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'private' | 'shared', // Updated type
  });

  const currentViewingUserId = dummyUsers[0].id; 
  const isOwnProfile = resolvedParams.userId === 'me' || resolvedParams.userId === currentViewingUserId;

  const handleEditFormChange = (field: keyof typeof editFormData, value: string | 'private' | 'shared') => { // Updated type
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    async function loadUserProfileAndSettings() {
      setLoading(true);
      const profile = await getUserProfile(resolvedParams.userId);
      setUser(profile);
      if (isOwnProfile) {
        const allowInference = await getEnableAutomaticPreferenceInference();
        setAllowAutoPreferenceInference(allowInference);
        if (profile) {
            setActivityInputForAI(preparePreferenceInferenceInput(profile));
        }
      }
      setLoading(false);
    }
    if (resolvedParams.userId) {
        loadUserProfileAndSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.userId, isOwnProfile]);

  useEffect(() => {
    if (user) {
      setLoadingProjects(true);
      getProjectsByOwner(user.id)
        .then(projects => {
          setUserProjects(projects);
        })
        .catch(error => {
          console.error("Error fetching user projects:", error);
          toast({ title: "Error Fetching Projects", description: "Could not load this user's projects.", variant: "destructive" });
        })
        .finally(() => {
          setLoadingProjects(false);
        });
    }
  }, [user, toast]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) {
      toast({ title: "Validation Error", description: "Project name is required and user must be loaded.", variant: "destructive" });
      return;
    }
    try {
      const projectData: Omit<Project, 'id'> = { // Ensure correct type for projectService.createProject
        name: newProjectName,
        description: newProjectDescription,
        ownerId: user.id,
        itemIds: [],
        visibility: newProjectVisibility,
        // sharedWith is intentionally omitted if not 'shared'
      };
      if (newProjectVisibility === 'shared') {
        projectData.sharedWith = []; // Initialize as empty, can be updated later
      }

      const createdProject = await createProject(projectData);

      setUserProjects(prevProjects => [createdProject, ...prevProjects]);
      toast({ title: "Project Created", description: `'${createdProject.name}' was successfully created.` });
      setShowCreateProjectModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectVisibility('private');
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ title: "Creation Failed", description: "Could not create the project. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !editFormData.name?.trim() || !user) {
      toast({ title: "Validation Error", description: "Project details are missing or invalid.", variant: "destructive" });
      return;
    }
    try {
      const projectUpdates: Partial<Omit<Project, 'id' | 'ownerId'>> = {
        name: editFormData.name,
        description: editFormData.description,
        visibility: editFormData.visibility,
        // itemIds and sharedWith are not part of this form, so they won't be sent for update
        // unless explicitly added. The service's updateProject should only update provided fields.
      };

      const updatedProject = await updateProject(selectedProject.id, projectUpdates);
      if (!updatedProject) {
        throw new Error("Project not found after update.");
      }

      setUserProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelectedProject(updatedProject); // Update the view in the modal
      setIsEditingSelectedProject(false);
      toast({ title: "Project Updated", description: `'${updatedProject.name}' was successfully updated.` });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({ title: "Update Failed", description: "Could not update the project. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteProjectWarning = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      handleDeleteProject(projectId);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) {
      toast({ title: "Error", description: "User not loaded.", variant: "destructive" });
      return;
    }
    try {
      const success = await deleteProject(projectId, user.id);
      if (success) {
        setUserProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        toast({ title: "Project Deleted", description: "The project was successfully deleted." });
        setSelectedProject(null); // Close modal
        setIsEditingSelectedProject(false); // Reset edit state
      } else {
        throw new Error("Deletion was not successful or user is not owner.");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ title: "Deletion Failed", description: String(error) || "Could not delete the project. Please try again.", variant: "destructive" });
    }
  };

  const handleLearnPreferences = async () => {
    if (!user) return;
    setIsLearningPreferences(true);
    const currentActivityInput = preparePreferenceInferenceInput(user); 
    setActivityInputForAI(currentActivityInput); 

    if (!currentActivityInput) {
        toast({ title: "Error", description: "Could not prepare data for AI.", variant: "destructive" });
        setIsLearningPreferences(false);
        return;
    }

    try {
      const result: InferUserPreferencesOutput = await inferUserPreferences(currentActivityInput);

      if (result.errorMessage || !result.suggestedPreferences) {
        toast({ title: "AI Preference Learning Error", description: result.errorMessage || "Could not infer preferences.", variant: "destructive" });
      } else {
        
        const updateSuccess = updateUserPreferencesInDummyData(user.id, result.suggestedPreferences as InferredUserPreferences);
        if (updateSuccess) {
          const updatedProfile = await getUserProfile(user.id); 
          setUser(updatedProfile); 
          if(updatedProfile) setActivityInputForAI(preparePreferenceInferenceInput(updatedProfile));

          toast({ title: "AI Learned Preferences!", description: `Preferences updated. Confidence: ${result.confidence}. Reasoning: ${result.reasoning || 'N/A'}`, duration: 7000 });
        } else {
          toast({ title: "Error Updating Preferences", description: "Could not save the learned preferences locally.", variant: "destructive" });
        }
      }
    } catch (error: any) {
      console.error("Error calling inferUserPreferences flow:", error);
      toast({ title: "AI System Error", description: error.message || "Could not connect to the preference learning service.", variant: "destructive" });
    } finally {
      setIsLearningPreferences(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading profile...</div>;
  }
  if (!user) {
    return <div className="text-center py-10 font-body">User not found.</div>;
  }

  const offeredItems = user.items.filter(item => item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending'));
  const wantedItems = user.items.filter(item => item.listingType === 'want' && (item.status === 'available' || item.status === 'pending'));
  const tradedOrFulfilledItems = user.items.filter(item => item.status === 'traded');
  
  const effectiveMinimumMatchRating = user.minimumMatchRating;

  const preferredLocation = user.logisticsPreferences?.preferredStoredLocationId && user.locations
    ? user.locations.find(loc => loc.id === user.logisticsPreferences!.preferredStoredLocationId)
    : (user.locations && user.locations.length > 0 ? user.locations.find(l => l.isDefault) || user.locations[0] : null);

  let preferredLocationIcon = <MapPin className="h-4 w-4 text-muted-foreground"/>;
  if (preferredLocation) {
    if (preferredLocation.name.toLowerCase().includes('work') || preferredLocation.name.toLowerCase().includes('office')) {
        preferredLocationIcon = <Briefcase className="h-4 w-4 text-muted-foreground"/>;
    } else if (preferredLocation.name.toLowerCase().includes('home') || preferredLocation.name.toLowerCase().includes('house') || preferredLocation.name.toLowerCase().includes('apt')) {
        preferredLocationIcon = <Home className="h-4 w-4 text-muted-foreground"/>;
    }
  }

  const chainDeliveryBadgeText = getChainDeliveryBadgeText(user.logisticsPreferences?.openToChainDelivery);
  
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg"><AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.dataAiHint || "user profile"} /><AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback></Avatar>
          <div className="flex-grow">
            <CardTitle className="text-3xl md:text-4xl font-headline mb-1">{user.name}</CardTitle>
            <RatingStarsDisplay score={user.rating} count={user.tradesCompleted} />
            <p className="font-body text-muted-foreground mt-2 max-w-xl">{user.bio || "This user hasn't added a bio yet."}</p>
          </div>
          {isOwnProfile ? null : (<Button variant="default" className="bg-primary hover:bg-primary/90"><MessageSquare className="mr-2 h-4 w-4" /> Message User</Button>)}
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-background rounded-lg"><Gift className="h-8 w-8 text-green-600 mx-auto mb-2"/><p className="text-2xl font-headline">{user.items.filter(i => i.listingType === 'offer').length}</p><p className="text-sm text-muted-foreground font-body">Items Offered</p></div>
            <div className="p-4 bg-background rounded-lg"><Search className="h-8 w-8 text-blue-600 mx-auto mb-2"/><p className="text-2xl font-headline">{user.items.filter(i => i.listingType === 'want').length}</p><p className="text-sm text-muted-foreground font-body">Items Wanted</p></div>
            <div className="p-4 bg-background rounded-lg"><Repeat className="h-8 w-8 text-accent mx-auto mb-2"/><p className="text-2xl font-headline">{user.tradesCompleted}</p><p className="text-sm text-muted-foreground font-body">Trades Completed / Wants Fulfilled</p></div>
        </CardContent>
      </Card>

      <Separator />
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex-grow">
                <CardTitle className="font-headline text-xl flex items-center gap-3"><Sparkles className="h-6 w-6 text-primary" />Trading Style &amp; Preferences</CardTitle>
                <CardDescription className="font-body mt-1">Insights into how {user.name} likes to trade. {isOwnProfile && allowAutoPreferenceInference && "Click the button to let AI analyze your activity and suggest updates!"}</CardDescription>
            </div>
            {isOwnProfile && allowAutoPreferenceInference && (
              <Button onClick={handleLearnPreferences} disabled={isLearningPreferences} size="sm" variant="outline" className="whitespace-nowrap">
                {isLearningPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4 text-accent" />}
                {isLearningPreferences ? "AI Learning..." : "AI, Update My Preferences"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
          <div>
            <h4 className="font-headline text-md mb-1 flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground"/>Minimum Match Rating:
            </h4>
            <Badge variant="outline" className="text-xs capitalize">
              {effectiveMinimumMatchRating}
            </Badge>
          </div>

          {user.motivations && user.motivations.length > 0 && (
            <div>
              <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-muted-foreground"/>Motivations:</h4>
              <div className="flex flex-wrap gap-1.5">
                {user.motivations.map(motivation => (
                  <Badge key={motivation} variant="outline" className="text-xs">{motivationTextMap[motivation] || motivation}</Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="md:col-span-2">
            <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/>Location & Delivery:</h4>
            <div className="space-y-1 pl-5">
                 <Badge variant={user.locationPreference?.isSensitive ? "secondary" : "outline"} className="text-xs">
                    {user.locationPreference?.isSensitive ? "Location Sensitive" : "Location Flexible"}
                </Badge>
                {user.locationPreference?.isSensitive && user.locationPreference.notes && (
                    <p className="text-xs text-muted-foreground font-body italic">{user.locationPreference.notes}</p>
                )}
                {preferredLocation ? (
                    <div className="flex items-center gap-1.5 text-xs">
                    {preferredLocationIcon}
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto max-w-full truncate">
                        {preferredLocation.name}{preferredLocation.address ? ` (${preferredLocation.address})` : ''}
                    </Badge>
                    </div>
                ): (
                   <div className="flex items-center gap-1.5 text-xs">
                     <MapPin className="h-4 w-4 text-muted-foreground"/>
                     <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">Default location not set</Badge>
                   </div>
                )}
                 {user.logisticsPreferences?.defaultDeliveryMethods && user.logisticsPreferences.defaultDeliveryMethods.length > 0 && (
                <div className="text-xs pt-0.5">
                    <div className="flex flex-wrap gap-1 mt-0.5">
                    {user.logisticsPreferences.defaultDeliveryMethods.map(method => (
                        <Badge key={method} variant="outline" className="text-xs cursor-default py-0.5 px-1.5">
                        {deliveryMethodDisplayMapConcrete[method] || method}
                        </Badge>
                    ))}
                    </div>
                </div>
                )}
            </div>
          </div>

          {user.tradeTimingPreference && (
            <div>
              <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/>Trade Timing:</h4>
              <Badge variant="outline" className="text-xs">{tradeTimingTextMap[user.tradeTimingPreference] || user.tradeTimingPreference}</Badge>
            </div>
          )}
          
          <div>
            <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground"/>3rd Party Fulfillments:</h4>
            <div className="flex flex-wrap items-center gap-1.5 pl-5">
                <Badge variant={user.interestedInThirdPartyFulfillment ? "default" : (user.interestedInThirdPartyFulfillment === false ? "secondary" : "outline")} className="text-xs">
                    {getThirdPartyFulfillmentSimpleText(user.interestedInThirdPartyFulfillment)}
                </Badge>
                {chainDeliveryBadgeText && (
                    <Badge 
                        variant={user.logisticsPreferences?.openToChainDelivery === true ? 'default' : 'secondary'} 
                        className="text-xs"
                    >
                        {chainDeliveryBadgeText}
                    </Badge>
                )}
            </div>
          </div>
          
          {isOwnProfile && allowAutoPreferenceInference && (
            <Collapsible open={showActivityForAI} onOpenChange={setShowActivityForAI} className="mt-4 md:col-span-2">
                 <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-left text-xs text-muted-foreground hover:text-foreground">
                        <span>{showActivityForAI ? 'Hide' : 'Show'} Data Sent to AI for Preference Update</span>
                        {showActivityForAI ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                    <div className="p-3 bg-muted/30 rounded-md border">
                    <h4 className="font-headline text-xs mb-1.5 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground"/>
                        Structured Input for AI ({user.name})
                    </h4>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                        {activityInputForAI ? JSON.stringify(activityInputForAI, null, 2) : "No activity data prepared yet."}
                    </pre>
                    </div>
                </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <Separator />
      <section><h2 className="text-2xl font-headline mb-4 flex items-center gap-2"><Gift className="h-6 w-6 text-green-600" />Items Offered ({offeredItems.length})</h2>{offeredItems.length > 0 ? <ItemList items={offeredItems} /> : <p className="text-muted-foreground font-body">This user has no items currently offered for trade.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4 flex items-center gap-2"><Search className="h-6 w-6 text-blue-600" />Items Wanted ({wantedItems.length})</h2>{wantedItems.length > 0 ? <ItemList items={wantedItems} /> : <p className="text-muted-foreground font-body">This user is not currently looking for any specific items.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">Trade &amp; Fulfillment History ({tradedOrFulfilledItems.length})</h2>{tradedOrFulfilledItems.length > 0 ? <ItemList items={tradedOrFulfilledItems} /> : <p className="text-muted-foreground font-body">No completed trades or fulfilled wants yet.</p>}</section>

      {/* Projects Section - Combined My Projects and Shared With Me */}
      <Separator />
      <section className="space-y-6">
        {/* My Projects Sub-section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-purple-600" />
              My Projects ({userProjects.length})
            </h2>
            {isOwnProfile && (
              <Button onClick={() => setShowCreateProjectModal(true)} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
              </Button>
            )}
          </div>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-muted-foreground font-body"><Loader2 className="h-5 w-5 animate-spin" />Loading my projects...</div>
          ) : userProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProject(project)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground font-body">{isOwnProfile ? "You haven't created any projects yet." : "This user currently has no projects with public or shared visibility."}</p>
            // Updated empty state message slightly for non-profile owners.
          )}
        </div>
        {/* "Shared With Me" section has been removed */}
      </section>

      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">User Reviews &amp; Ratings</h2><Card><CardContent className="p-6"><p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p></CardContent></Card></section>

      {/* Modal for Viewing Project Details / Editing Project */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={(isOpen) => {
          if(!isOpen) {
            setSelectedProject(null);
            setIsEditingSelectedProject(false); // Reset edit mode on close
          }
        }}>
            <DialogContent className="sm:max-w-[600px] bg-card">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">
                      {isEditingSelectedProject ? `Edit Project: ${editFormData.name}` : selectedProject.name}
                    </DialogTitle>
                    {!isEditingSelectedProject && selectedProject.description && <DialogDescription className="font-body">{selectedProject.description}</DialogDescription>}
                    {isEditingSelectedProject && <DialogDescription className="font-body">Update the details for your project.</DialogDescription>}
                </DialogHeader>

                {isEditingSelectedProject ? (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="editProjectName" className="text-right font-body">Name</Label>
                      <Input id="editProjectName" value={editFormData.name} onChange={(e) => handleEditFormChange('name', e.target.value)} className="col-span-3 font-body" placeholder="Project Name" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="editProjectDescription" className="text-right font-body">Description</Label>
                      <Textarea id="editProjectDescription" value={editFormData.description} onChange={(e) => handleEditFormChange('description', e.target.value)} className="col-span-3 font-body" placeholder="Brief description" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="editProjectVisibility" className="text-right font-body">Visibility</Label>
                      <Select value={editFormData.visibility} onValueChange={(value: 'private' | 'shared') => handleEditFormChange('visibility', value)}>
                        <SelectTrigger className="col-span-3 font-body">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private" className="font-body">Private (Only you can add items; only you can see)</SelectItem>
                          <SelectItem value="shared" className="font-body">Shared (Anyone can add items; everyone can see)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 max-h-[60vh] overflow-y-auto">
                      <ProjectDetails project={selectedProject} />
                  </div>
                )}

                <DialogFooter>
                  {!isEditingSelectedProject && (
                    <>
                      <Button onClick={() => {setSelectedProject(null); setIsEditingSelectedProject(false);}} variant="outline">Close</Button>
                      {/* Edit/Delete only if profile owner AND selected project is owned by them */}
                      {isOwnProfile && selectedProject && selectedProject.ownerId === user.id && (
                        <>
                          <Button variant="outline" onClick={() => {
                            setEditFormData({
                              name: selectedProject.name,
                              description: selectedProject.description,
                              visibility: selectedProject.visibility,
                            });
                            setIsEditingSelectedProject(true);
                          }}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeleteProjectWarning(selectedProject.id)}>
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {isEditingSelectedProject && isOwnProfile && (
                    <>
                      <Button variant="outline" onClick={() => {
                        setIsEditingSelectedProject(false);
                        // Reset editFormData to selectedProject's current state if user cancels edit
                        setEditFormData({
                           name: selectedProject.name,
                           description: selectedProject.description,
                           visibility: selectedProject.visibility,
                        });
                      }}>Cancel</Button>
                      <Button onClick={handleUpdateProject} disabled={!editFormData.name?.trim()}>Save Changes</Button>
                    </>
                  )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {/* Modal for Creating New Project */}
      {isOwnProfile && showCreateProjectModal && (
        <Dialog open={showCreateProjectModal} onOpenChange={setShowCreateProjectModal}>
          <DialogContent className="sm:max-w-[480px] bg-card">
            <DialogHeader>
              <DialogTitle className="font-headline">Create New Project</DialogTitle>
              <DialogDescription className="font-body">Enter the details for your new project. Click save when you're done.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectName" className="text-right font-body">Name</Label>
                <Input id="projectName" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="col-span-3 font-body" placeholder="Project Name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectDescription" className="text-right font-body">Description</Label>
                <Textarea id="projectDescription" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} className="col-span-3 font-body" placeholder="Brief description of your project" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectVisibility" className="text-right font-body">Visibility</Label>
                <Select value={newProjectVisibility} onValueChange={(value: 'private' | 'shared') => setNewProjectVisibility(value)}>
                  <SelectTrigger className="col-span-3 font-body">
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
              <Button variant="outline" onClick={() => setShowCreateProjectModal(false)} className="font-body">Cancel</Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="font-body">Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
// Added Edit3 and Trash2 to lucide imports if they are not already there.
// Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Lightbulb, Wand2, Loader2, FileText, ChevronDown, ChevronUp, Filter, Truck, Home, Briefcase, PlusCircle
// Need to ensure Edit3 and Trash2 are added to the main lucide-react import line.
// The current import has: Edit3, Briefcase, PlusCircle. So Trash2 might be needed.
// Re-checked: Edit3 is already in the import line. Trash2 is not.
// Will add Trash2 to the imports.
