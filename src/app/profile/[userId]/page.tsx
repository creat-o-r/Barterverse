
"use client";

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { dummyUsers, dummyItems, updateUserPreferencesInDummyData } from '@/lib/dummy-data';
import type { User, Item, UserMotivation, TradeTimingPreference, UserProfilePreferences as UserProfilePreferencesType, InferredUserPreferences, UserLogisticsPreferences, UserStoredLocation, ItemDeliveryMethod } from '@/types';
import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { getEnableAutomaticPreferenceInference } from '@/services/ai-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Handshake, Lightbulb, Wand2, Loader2, FileText, ChevronDown, ChevronUp, Filter, Truck, Home, Briefcase } from 'lucide-react';
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

const DefaultLogisticsDisplay = ({ logisticsPreferences, locations, isOwnProfile }: { logisticsPreferences?: UserLogisticsPreferences, locations?: UserStoredLocation[], isOwnProfile: boolean }) => {
  if (!logisticsPreferences && (!locations || locations.length === 0)) {
    return (
      <CardContent className="pt-2">
        <p className="text-muted-foreground font-body">Logistics preferences not set up yet.</p>
        {isOwnProfile && (
          <Button variant="outline" size="sm" className="mt-3" disabled>
            <Edit3 className="mr-2 h-4 w-4" /> Set Up Logistics
          </Button>
        )}
      </CardContent>
    );
  }

  const deliveryMethodDisplayMap: Record<ItemDeliveryMethod, string> = {
    pickup_only: "Pickup",
    willing_to_ship: "Willing to Ship",
    delivery_area: "Delivery Area",
    possible_delivery: "Possible Delivery",
    public_meetup: "Public Meetup",
    flexible_meetup: "Flexible Meetup",
  };

  const preferredLocation = logisticsPreferences?.preferredStoredLocationId && locations
    ? locations.find(loc => loc.id === logisticsPreferences.preferredStoredLocationId)
    : null;

  return (
    <CardContent className="space-y-4 pt-2">
      <div className="p-3 border rounded-lg bg-background shadow-sm space-y-2">
        <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <span className="font-headline text-md">Delivery Methods</span>
        </div>
        {logisticsPreferences?.defaultDeliveryMethods && logisticsPreferences.defaultDeliveryMethods.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {logisticsPreferences.defaultDeliveryMethods.map(method => (
              <Badge key={method} variant="outline" className="text-xs cursor-default">
                {deliveryMethodDisplayMap[method] || method}
              </Badge>
            ))}
          </div>
        ) : (
             <p className="text-xs text-muted-foreground font-body">No default delivery methods set.</p>
        )}
      </div>

       <div className="flex justify-between items-center p-3 border rounded-lg bg-background shadow-sm">
            <div className="flex items-center gap-2">
                {preferredLocation ? (
                    preferredLocation.name.toLowerCase().includes('work') || preferredLocation.name.toLowerCase().includes('office') ? 
                    <Briefcase className="h-5 w-5 text-muted-foreground" /> : 
                    <Home className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-headline text-md">Preferred Item Location</span>
            </div>
            <Badge variant="outline" className="text-xs px-2 py-1 h-auto max-w-[200px] truncate cursor-default">
                {preferredLocation ? `${preferredLocation.name} ${preferredLocation.address ? `(${preferredLocation.address.substring(0,20)}${preferredLocation.address.length > 20 ? '...' : ''})` : '(Address not set)'}` : 
                (logisticsPreferences?.preferredStoredLocationId ? `ID: ${logisticsPreferences.preferredStoredLocationId}` : 'Not set')}
            </Badge>
        </div>
        
      {logisticsPreferences?.openToChainDelivery !== undefined && (
        <div className="flex justify-between items-center p-3 border rounded-lg bg-background shadow-sm">
           <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-muted-foreground" />
              <span className="font-headline text-md">Chain Delivery</span>
           </div>
            <Badge variant={logisticsPreferences.openToChainDelivery ? "default" : "secondary"} className="text-xs cursor-default">
                {logisticsPreferences.openToChainDelivery ? "Yes" : "No"}
            </Badge>
        </div>
      )}


      {isOwnProfile && (
        <Button variant="outline" size="sm" className="mt-4 w-full md:w-auto" disabled>
          <Edit3 className="mr-2 h-4 w-4" /> Edit Logistics Preferences
        </Button>
      )}
    </CardContent>
  );
};


export default function UserProfilePage({ params: paramsProp }: { params: { userId: string } }) {
  const resolvedParams = use(paramsProp); 
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowAutoPreferenceInference, setAllowAutoPreferenceInference] = useState(false);
  const [isLearningPreferences, setIsLearningPreferences] = useState(false);
  const [showActivityForAI, setShowActivityForAI] = useState(false);
  const [activityInputForAI, setActivityInputForAI] = useState<InferUserPreferencesInput | null>(null);
  const { toast } = useToast();

  const currentViewingUserId = dummyUsers[0].id; 
  const isOwnProfile = resolvedParams.userId === 'me' || resolvedParams.userId === currentViewingUserId;

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
          {isOwnProfile ? (<Button variant="outline"><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</Button>) : (<Button variant="default" className="bg-primary hover:bg-primary/90"><MessageSquare className="mr-2 h-4 w-4" /> Message User</Button>)}
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
                <CardTitle className="font-headline text-xl flex items-center gap-3"><Sparkles className="h-6 w-6 text-primary" />Trading Style & Preferences</CardTitle>
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
        <CardContent className="space-y-4 pt-2">
          <div>
            <h4 className="font-headline text-md mb-1 flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground"/>Minimum Match Rating:
            </h4>
            <Badge variant="outline" className="text-xs capitalize">
              {effectiveMinimumMatchRating}
            </Badge>
          </div>
          <div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground"/>3rd Party Fulfillments:</h4><Badge variant={user.interestedInThirdPartyFulfillment ? "default" : "secondary"} className="text-xs">{user.interestedInThirdPartyFulfillment ? "Open to it" : "Prefers direct trades"}</Badge></div>
          {user.motivations && user.motivations.length > 0 && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-muted-foreground"/>Motivations:</h4><div className="flex flex-wrap gap-1.5">{user.motivations.map(motivation => (<Badge key={motivation} variant="outline" className="text-xs">{motivationTextMap[motivation] || motivation}</Badge>))}</div></div>)}
          {user.locationPreference && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/>Location Preference:</h4><Badge variant={user.locationPreference.isSensitive ? "secondary" : "outline"} className="text-xs">{user.locationPreference.isSensitive ? "Location Sensitive" : "Location Flexible"}</Badge>{user.locationPreference.isSensitive && user.locationPreference.notes && (<p className="text-xs text-muted-foreground font-body italic mt-1">{user.locationPreference.notes}</p>)}</div>)}
          {user.tradeTimingPreference && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/>Trade Timing:</h4><Badge variant="outline" className="text-xs">{tradeTimingTextMap[user.tradeTimingPreference] || user.tradeTimingPreference}</Badge></div>)}
          
          {isOwnProfile && allowAutoPreferenceInference && (
            <Collapsible open={showActivityForAI} onOpenChange={setShowActivityForAI} className="mt-4">
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

       <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="font-headline text-xl flex items-center gap-3">
              <Truck className="h-6 w-6 text-primary" />Logistics Preferences
            </CardTitle>
          </div>
           <CardDescription className="font-body mt-1">
            These are {user.name}&apos;s general settings for item location and delivery. Individual items can override these.
          </CardDescription>
        </CardHeader>
        <DefaultLogisticsDisplay 
            logisticsPreferences={user.logisticsPreferences} 
            locations={user.locations}
            isOwnProfile={isOwnProfile}
        />
      </Card>


      <Separator />
      <section><h2 className="text-2xl font-headline mb-4 flex items-center gap-2"><Gift className="h-6 w-6 text-green-600" />Items Offered ({offeredItems.length})</h2>{offeredItems.length > 0 ? <ItemList items={offeredItems} /> : <p className="text-muted-foreground font-body">This user has no items currently offered for trade.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4 flex items-center gap-2"><Search className="h-6 w-6 text-blue-600" />Items Wanted ({wantedItems.length})</h2>{wantedItems.length > 0 ? <ItemList items={wantedItems} /> : <p className="text-muted-foreground font-body">This user is not currently looking for any specific items.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">Trade & Fulfillment History ({tradedOrFulfilledItems.length})</h2>{tradedOrFulfilledItems.length > 0 ? <ItemList items={tradedOrFulfilledItems} /> : <p className="text-muted-foreground font-body">No completed trades or fulfilled wants yet.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">User Reviews & Ratings</h2><Card><CardContent className="p-6"><p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p></CardContent></Card></section>
    </div>
  );
}

