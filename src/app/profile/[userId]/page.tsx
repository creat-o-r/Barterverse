
"use client";

import { useState, useEffect } from 'react'; // Removed 'use'
import Image from 'next/image';
// import { dummyUsers, dummyItems, updateUserPreferencesInDummyData } from '@/lib/dummy-data'; // Firebase data
import type { UserProfileDocument, Item as ItemType, UserMotivation, TradeTimingPreference, UserProfilePreferences as UserProfilePreferencesType, InferredUserPreferences, ItemDeliveryMethod } from '@/types'; // Adjusted imports
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { db } from '@/lib/firebase'; // Import db
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'; // Firestore imports
// import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow'; // AI Features (optional for now)
// import { getEnableAutomaticPreferenceInference } from '@/services/ai-config-service'; // AI Features (optional for now)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList'; // Assuming ItemList can take ItemType[]
import { Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Lightbulb, Wand2, Loader2, FileText, ChevronDown, ChevronUp, Filter, Truck, Home, Briefcase, Mail } from 'lucide-react'; // Added Mail
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns'; // For formatting createdAt date

// Helper function to convert Firestore data to UserProfileDocument, handling Timestamps
const processUserProfileData = (docSnap: any): UserProfileDocument => {
  const data = docSnap.data();
  return {
    ...data,
    uid: docSnap.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  } as UserProfileDocument;
};

// Helper function to convert Firestore data to ItemType, handling Timestamps
const processItemData = (docSnap: any): ItemType => {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  } as ItemType;
};

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

// AI Preference Input preparation might need to be adapted if UserProfileDocument is used
// const preparePreferenceInferenceInput = (user: UserProfileDocument | null): InferUserPreferencesInput | null => { ... }


const RatingStarsDisplay = ({ score, count }: { score: number, count?: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => ( <Star key={i} className={`h-5 w-5 ${i < Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /> ))}
    <span className="ml-2 text-sm text-muted-foreground">{score.toFixed(1)} {count ? `(${count} ratings)` : ''}</span>
  </div>
);

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const { userId: routeUserId } = params;
  const { user: authUser, loading: authLoading } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfileDocument | null>(null);
  const [userItems, setUserItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI related states - kept for structure, functionality might be adapted/removed later
  const [allowAutoPreferenceInference, setAllowAutoPreferenceInference] = useState(false);
  const [isLearningPreferences, setIsLearningPreferences] = useState(false);
  const [showActivityForAI, setShowActivityForAI] = useState(false);
  // const [activityInputForAI, setActivityInputForAI] = useState<InferUserPreferencesInput | null>(null);
  const { toast } = useToast();

  const isOwnProfile = authUser && (routeUserId === 'me' || routeUserId === authUser.uid);
  const displayUserId = routeUserId === 'me' && authUser ? authUser.uid : routeUserId;

  useEffect(() => {
    // Initial check: if routeUserId is 'me' and authUser is not yet loaded, wait.
    if (routeUserId === 'me' && !authUser && authLoading) {
      // Still loading auth user, do nothing yet. Effect will re-run when authUser changes.
      setLoading(true); // Keep loading true
      return;
    }
    // If routeUserId is 'me' and authUser is loaded but null (not logged in)
    if (routeUserId === 'me' && !authUser && !authLoading) {
      setError("Please log in to view your profile.");
      setLoading(false);
      setUserProfile(null);
      setUserItems([]);
      return;
    }

    // If displayUserId is not determined (e.g. 'me' but not logged in after auth check), then error or wait.
    if (!displayUserId) {
        if (!authLoading) { // only set error if auth is done loading and displayUserId is still not resolved
            setError("User ID could not be determined.");
            setLoading(false);
        }
        return;
    }

    // Placeholder for data fetching logic, will be filled in next steps
    const loadData = async () => {
      if (!displayUserId) { // Should be caught by earlier checks, but good safeguard
        setError("User ID is not available for fetching data.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch User Profile
        const userDocRef = doc(db, "users", displayUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profileData = processUserProfileData(userDocSnap);
          setUserProfile(profileData);
          // AI related logic (currently simplified)
          // if (isOwnProfile) {
          //   const allowInference = false; // await getEnableAutomaticPreferenceInference(); // This might be a service call
          //   setAllowAutoPreferenceInference(allowInference);
          //   // setActivityInputForAI(preparePreferenceInferenceInput(profileData)); // Adapt this function
          // }
        } else {
          setError("User profile not found.");
          setUserProfile(null);
          // If profile not found, no need to fetch items for this user.
          // However, if there was a general error, items might still be an empty array.
          setUserItems([]); // Clear items if profile not found
          setLoading(false); // Set loading false as profile fetch failed/not found
          return; // Exit loadData early
        }

        // Fetch User Items
        const itemsQuery = query(collection(db, "items"), where("ownerId", "==", displayUserId));
        const itemsSnapshot = await getDocs(itemsQuery);
        const fetchedItems = itemsSnapshot.docs.map(processItemData);
        setUserItems(fetchedItems);

      } catch (e: any) {
        console.error("Error loading profile data or items:", e);
        setError(e.message || "Failed to load data.");
        setUserProfile(null);
        setUserItems([]);
      } finally {
        setLoading(false); // All data fetching attempts are complete
      }
    };

    if (displayUserId) {
        loadData();
    } else if (!authLoading) {
        // If displayUserId is still not set after auth has loaded (e.g. 'me' for a logged out user)
        setError("Cannot determine user to display.");
        setLoading(false);
    }
    // Dependencies for useEffect
  }, [displayUserId, authUser, authLoading, routeUserId, isOwnProfile]);


  // handleLearnPreferences and other complex logic can be adapted or simplified later
  const handleLearnPreferences = async () => {
     if (!userProfile) return;
     setIsLearningPreferences(true);
     toast({ title: "AI Learning (Not Implemented)", description: "This feature needs to be adapted.", variant: "default"});
     setIsLearningPreferences(false);
  };

  if (loading || (routeUserId === 'me' && authLoading)) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center py-10 font-body text-red-500">{error}</div>;
  }
  
  // This condition means loading is false, and there was no error, but profile is still null.
  // This implies the user was not found.
  if (!userProfile) {
    return <div className="text-center py-10 font-body">User profile not found.</div>;
  }


  const offeredItems = userItems.filter(item => item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending'));
  const wantedItems = userItems.filter(item => item.listingType === 'want' && (item.status === 'available' || item.status === 'pending'));
  const tradedOrFulfilledItems = userItems.filter(item => item.status === 'traded');

  // These will need to be adapted based on UserProfileDocument structure
  const effectiveMinimumMatchRating = "N/A"; // Placeholder
  const preferredLocation = null; // Placeholder
  let preferredLocationIcon = <MapPin className="h-4 w-4 text-muted-foreground"/>;
  const chainDeliveryBadgeText = null; // Placeholder
  
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || 'User'} />
            <AvatarFallback className="text-4xl">{(userProfile.displayName || 'U').charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <CardTitle className="text-3xl md:text-4xl font-headline mb-1">{userProfile.displayName}</CardTitle>
            {/* Rating and tradesCompleted might need separate fetching or calculation if not on UserProfileDocument */}
            {/* <RatingStarsDisplay score={userProfile.rating || 0} count={userProfile.tradesCompleted || 0} /> */}
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" /> {userProfile.email}
            </p>
            {userProfile.displayLocation && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" /> {userProfile.displayLocation}
                </p>
            )}
            <p className="font-body text-muted-foreground mt-2 max-w-xl">{userProfile.bio || "This user hasn't added a bio yet."}</p>
            {userProfile.createdAt && (
                <p className="text-xs text-muted-foreground mt-2">Joined: {format(userProfile.createdAt, "PPP")}</p>
            )}
          </div>
          {isOwnProfile ? (
            <Button asChild variant="outline"><Link href="/profile/edit"><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</Link></Button>
          ) : (
            <Button variant="default" className="bg-primary hover:bg-primary/90"><MessageSquare className="mr-2 h-4 w-4" /> Message User</Button>
          )}
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {/* Counts now use userItems state */}
            <div className="p-4 bg-background rounded-lg"><Gift className="h-8 w-8 text-green-600 mx-auto mb-2"/><p className="text-2xl font-headline">{offeredItems.length}</p><p className="text-sm text-muted-foreground font-body">Items Offered</p></div>
            <div className="p-4 bg-background rounded-lg"><Search className="h-8 w-8 text-blue-600 mx-auto mb-2"/><p className="text-2xl font-headline">{wantedItems.length}</p><p className="text-sm text-muted-foreground font-body">Items Wanted</p></div>
            {/* userProfile.tradesCompleted might not exist on UserProfileDocument, adjust if needed */}
            <div className="p-4 bg-background rounded-lg"><Repeat className="h-8 w-8 text-accent mx-auto mb-2"/><p className="text-2xl font-headline">{userProfile.tradesCompleted || 0}</p><p className="text-sm text-muted-foreground font-body">Trades Completed</p></div>
        </CardContent>
      </Card>

      {/* AI Preferences section and detailed logistics display might need more data from UserProfileDocument or be simplified */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex-grow">
                <CardTitle className="font-headline text-xl flex items-center gap-3"><Sparkles className="h-6 w-6 text-primary" />Trading Style &amp; Preferences</CardTitle>
                <CardDescription className="font-body mt-1">Insights into how {userProfile.displayName} likes to trade. {isOwnProfile && allowAutoPreferenceInference && "Click the button to let AI analyze your activity and suggest updates!"}</CardDescription>
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
    
