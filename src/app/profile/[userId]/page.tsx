
"use client";

import { use, useState, useEffect, ReactNode } from 'react'; // Added ReactNode
import Image from 'next/image';
import { getUserProfile as getUserProfileFromDb, updateUserProfile } from '@/services/userService'; // Import userService
import { getItemsByUserId } from '@/services/itemService'; // Import itemService
import type { User, Item, UserMotivation, TradeTimingPreference, UserProfilePreferences as UserProfilePreferencesType, InferredUserPreferences, ItemDeliveryMethod } from '@/types';
import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { getEnableAutomaticPreferenceInference } from '@/services/ai-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Lightbulb, Wand2, Loader2, FileText, ChevronDown, ChevronUp, Filter, Truck, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Removed local getUserProfile function. Will use services directly.

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
  if (!user || !user.items) return null; // Ensure user and user.items exist

  // Use user.items (already fetched from Firestore)
  const userListedItems = user.items
    .filter(i => (i.status === 'available' || i.status === 'pending')) // ownerId check is implicitly done by getItemsByUserId
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


export default function UserProfilePage({ params: paramsProp }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(paramsProp); 
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowAutoPreferenceInference, setAllowAutoPreferenceInference] = useState(false);
  const [isLearningPreferences, setIsLearningPreferences] = useState(false);
  const [showActivityForAI, setShowActivityForAI] = useState(false);
  const [activityInputForAI, setActivityInputForAI] = useState<InferUserPreferencesInput | null>(null);
  const { toast } = useToast();
  const { currentUser: authCurrentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Determine if this is the authenticated user's own profile
  const isOwnProfile = resolvedParams.userId === 'me' || (authCurrentUser?.uid && resolvedParams.userId === authCurrentUser.uid);
  const effectiveUserId = resolvedParams.userId === 'me' ? authCurrentUser?.uid : resolvedParams.userId;

  useEffect(() => {
    async function loadUserProfileAndSettings() {
      if (!effectiveUserId) {
        // If 'me' and not logged in, or no userId, then nothing to load.
        // Auth check below will handle redirection if needed for 'me'.
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const profileData = await getUserProfileFromDb(effectiveUserId);
        if (profileData) {
          const userItems = await getItemsByUserId(effectiveUserId);
          // Ensure items are part of the user object for preparePreferenceInferenceInput and rendering
          const fullProfile = { ...profileData, items: userItems };
          setUser(fullProfile);

          if (isOwnProfile && fullProfile) {
            const allowInference = await getEnableAutomaticPreferenceInference();
            setAllowAutoPreferenceInference(allowInference);
            // preparePreferenceInferenceInput expects items on the user object
            setActivityInputForAI(preparePreferenceInferenceInput(fullProfile));
          }
        } else {
          setUser(null); // User not found
        }
      } catch (error) {
        console.error("Error loading user profile and items:", error);
        setUser(null);
        toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadUserProfileAndSettings();
  }, [resolvedParams.userId, effectiveUserId, isOwnProfile, toast]); // Added toast to deps

  // Auth check: If accessing 'me' profile and not authenticated (after initial auth load)
  useEffect(() => {
    if (resolvedParams.userId === 'me' && !authLoading && !authCurrentUser) {
      router.push('/auth/signin');
    }
  }, [resolvedParams.userId, authLoading, authCurrentUser, router]);


  const handleLearnPreferences = async () => {
    if (!user || !authCurrentUser || user.id !== authCurrentUser.uid) { // Ensure it's own profile for learning
        toast({title: "Error", description: "Cannot learn preferences for another user.", variant: "destructive"});
        return;
    }
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
        try {
          // Update user profile in Firestore
          await updateUserProfile(user.id, result.suggestedPreferences as Partial<User>);

          // Refetch the full profile including items
          const profileData = await getUserProfileFromDb(user.id);
          if (profileData) {
            const userItems = await getItemsByUserId(user.id);
            const fullProfile = { ...profileData, items: userItems };
            setUser(fullProfile);
            if(fullProfile) setActivityInputForAI(preparePreferenceInferenceInput(fullProfile));
            toast({ title: "AI Learned Preferences!", description: `Preferences updated. Confidence: ${result.confidence}. Reasoning: ${result.reasoning || 'N/A'}`, duration: 7000 });
          } else {
            toast({ title: "Error Fetching Updated Profile", description: "Preferences saved, but could not refetch profile.", variant: "destructive" });
          }
        } catch (updateError: any) {
          console.error("Error updating user preferences in Firestore:", updateError);
          toast({ title: "Error Saving Preferences", description: updateError.message || "Could not save learned preferences to the database.", variant: "destructive" });
        }
      }
    } catch (error: any) {
      console.error("Error calling inferUserPreferences flow:", error);
      toast({ title: "AI System Error", description: error.message || "Could not connect to the preference learning service.", variant: "destructive" });
    } finally {
      setIsLearningPreferences(false);
    }
  };

  if (authLoading && resolvedParams.userId === 'me' && !authCurrentUser) {
    // Show loading state specifically for 'me' profile while auth is resolving
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Verifying user session...</div>;
  }

  if (loading) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading profile...</div>;
  }

  // If trying to access 'me' but not logged in (and auth is done loading), this message will show before redirection effect kicks in.
  if (resolvedParams.userId === 'me' && !authCurrentUser) {
    return <div className="text-center py-10 font-body">Please sign in to view your profile. Redirecting...</div>;
  }

  if (!user) {
    // This can happen if a specific userId is invalid, or if 'me' was requested but user data couldn't be loaded (e.g. new user not in dummy data)
    return <div className="text-center py-10 font-body">User profile not found for ID: {effectiveUserId || resolvedParams.userId}.</div>;
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
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">User Reviews &amp; Ratings</h2><Card><CardContent className="p-6"><p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p></CardContent></Card></section>
    </div>
  );
}
    
