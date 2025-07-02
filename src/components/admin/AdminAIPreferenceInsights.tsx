
"use client";

import { useState, useEffect } from 'react';
import type { User, Item as FullItemType, UserMotivation, TradeTimingPreference, UserProfilePreferences as UserProfilePreferencesType } from '@/types';
// import { dummyUsers, dummyItems } from '@/lib/dummy-data'; // Replaced with Firestore
import { getAllUsers, getItemsByOwner } from '@/lib/firebase/firestoreUtils'; // Firestore access
import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Brain, ChevronDown, ChevronUp, UserCircle as UserIconLucide, Loader2, AlertCircle, Filter, Users } from 'lucide-react'; // Added Users icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

const motivationTextMap: Record<UserMotivation, string> = {
  'help-others': 'Helping Others',
  'maximize-trades': 'Maximizing Trades',
  'convenience-focused': 'Convenience',
  'community-building': 'Community Building',
  'unique-finds': 'Finding Unique Items',
};

const tradeTimingTextMap: Record<TradeTimingPreference, string> = {
  'simultaneous': 'Prefers Simultaneous',
  'staged': 'Open to Staged Trades',
  'flexible': 'Flexible Timing',
};

// Updated to accept fetched items
const preparePreferenceInferenceInputForAdmin = (user?: User, userOwnedItems?: FullItemType[]): InferUserPreferencesInput | null => {
  if (!user) return null;

  const userListedItems = (userOwnedItems || [])
    .filter(i => (i.status === 'available' || i.status === 'pending'))
    .slice(0, 5) // Take up to 5 items for brevity in admin demo
    .map(item => ({
      name: item.name,
      description: item.description.substring(0,100) + (item.description.length > 100 ? "..." : ""), // Truncate
      category: item.category,
      listingType: item.listingType,
    }));

  const currentPrefs: UserProfilePreferencesType | undefined = {
    motivations: user.motivations,
    locationPreference: user.locationPreference,
    tradeTimingPreference: user.tradeTimingPreference,
    interestedInThirdPartyFulfillment: user.interestedInThirdPartyFulfillment,
    minimumMatchRating: user.minimumMatchRating,
  };

  const engagementNotes: string[] = [];
  if (user.tradesCompleted > 10) engagementNotes.push("Experienced trader based on trade volume.");
  else if (user.tradesCompleted < 2 && userListedItems.length < 2) engagementNotes.push("Limited activity data available (few trades, few listings).");
  if (user.locationPreference?.isSensitive) engagementNotes.push(`Notes indicate location sensitivity: "${user.locationPreference.notes || 'General sensitivity'}"`);
  if (user.minimumMatchRating === 'High') engagementNotes.push("User explicitly prefers High quality matches.");


  const simulatedChatSnippets: string[] = [];
  if (user.motivations?.includes('convenience-focused')) simulatedChatSnippets.push("Prefers quick local meetups if possible.");
  if (user.motivations?.includes('unique-finds')) simulatedChatSnippets.push("Often asks very specific questions about item condition or rarity.");
  if (user.minimumMatchRating === 'High') simulatedChatSnippets.push("Only looking for high quality, I won't waste time on lowball offers.");
  if (simulatedChatSnippets.length === 0) simulatedChatSnippets.push("Generally polite and open to discussion in simulated chats.");


  return {
    userId: user.id,
    listedItems: userListedItems.length > 0 ? userListedItems : undefined, // omit if empty
    currentPreferences: Object.values(currentPrefs).some(val => val !== undefined && (!Array.isArray(val) || val.length >0)) ? currentPrefs : undefined,
    simulatedChatSnippets: simulatedChatSnippets.length > 0 ? simulatedChatSnippets : undefined,
    engagementNotes: engagementNotes.length > 0 ? engagementNotes : undefined,
    tradesCompleted: user.tradesCompleted,
  };
};


export default function AdminAIPreferenceInsights() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOwnedItems, setUserOwnedItems] = useState<FullItemType[]>([]);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showActivityData, setShowActivityData] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [currentInsights, setCurrentInsights] = useState<InferUserPreferencesOutput | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const { toast } = useToast();

  const [activityInputForAI, setActivityInputForAI] = useState<InferUserPreferencesInput | null>(null);

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersFromDB = await getAllUsers();
        setAllUsers(usersFromDB);
        if (usersFromDB.length > 0 && !selectedUserId) {
          setSelectedUserId(usersFromDB[0].id); // Auto-select first user
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error Fetching Users", description: "Could not load users from Firestore.", variant: "destructive" });
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount

  // When selectedUserId changes, find the user and fetch their items
  useEffect(() => {
    if (!selectedUserId || allUsers.length === 0) {
      setSelectedUser(null);
      setUserOwnedItems([]);
      return;
    }
    const user = allUsers.find(u => u.id === selectedUserId) || null;
    setSelectedUser(user);

    if (user) {
      const fetchUserItems = async () => {
        try {
          const items = await getItemsByOwner(user.id);
          setUserOwnedItems(items);
        } catch (error) {
          console.error(`Error fetching items for user ${user.id}:`, error);
          toast({ title: "Error Fetching Items", description: `Could not load items for ${user.name}.`, variant: "destructive" });
          setUserOwnedItems([]);
        }
      };
      fetchUserItems();
    } else {
      setUserOwnedItems([]);
    }
  }, [selectedUserId, allUsers, toast]);

  // When selectedUser or their items change, prepare input for AI
   useEffect(() => {
    if (selectedUser) {
      setActivityInputForAI(preparePreferenceInferenceInputForAdmin(selectedUser, userOwnedItems));
    } else {
      setActivityInputForAI(null);
    }
  }, [selectedUser, userOwnedItems]);


  // When activityInputForAI is ready (and valid), fetch AI insights
  useEffect(() => {
    if (!selectedUserId || !selectedUser || !activityInputForAI) {
      setCurrentInsights(null);
      setInsightsError(null);
      if (selectedUser && !activityInputForAI) { // If user is selected but input couldn't be prepared
        // This case might be handled by activityInputForAI effect setting it to null
      }
      return;
    }

    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      setCurrentInsights(null);
      setInsightsError(null);
      
      // activityInputForAI is already prepared by the previous useEffect
      // const currentActivityInput = preparePreferenceInferenceInputForAdmin(selectedUser, userOwnedItems);
      // setActivityInputForAI(currentActivityInput); // This line is redundant now

      if (!activityInputForAI) { // Should not happen if previous effect worked, but as a safeguard
        setInsightsError("Could not prepare activity data for the selected user.");
        setIsLoadingInsights(false);
        return;
      }

      try {
        const result: InferUserPreferencesOutput = await inferUserPreferences(activityInputForAI);
        
        if (result.errorMessage) {
            setInsightsError(result.errorMessage);
            toast({ title: "AI Preference Inference Warning", description: result.errorMessage, variant: "default", duration: 7000 });
        } else if (!result.suggestedPreferences) {
            const errMsg = "AI did not return preference suggestions for this user.";
            setInsightsError(errMsg);
            toast({ title: "AI Preference Inference Issue", description: errMsg, variant: "default", duration: 7000 });
        }
        setCurrentInsights(result);

      } catch (error: any) {
        console.error("Error fetching real AI preference insights for admin view:", error);
        const errMsg = "Failed to fetch AI preference insights. " + (error.message || "Check console for details.");
        setInsightsError(errMsg);
        toast({ title: "AI System Error", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoadingInsights(false);
      }
    };

    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityInputForAI]); // Trigger when activityInputForAI is updated


  const renderInsights = () => {
    if (isLoadingInsights) {
      return (
        <div className="text-center py-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Fetching AI insights...
        </div>
      );
    }
    if (insightsError) {
      return (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-md text-destructive flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
                <p className="font-semibold">Error Fetching Insights:</p>
                <p className="text-xs whitespace-pre-wrap break-all max-h-48 overflow-auto">{insightsError}</p>
            </div>
        </div>
      );
    }
    if (!currentInsights || !currentInsights.suggestedPreferences) {
      return <p className="text-muted-foreground text-center py-4">No AI insights available for this user currently, or AI could not make suggestions.</p>;
    }

    const suggestions = currentInsights.suggestedPreferences;

    return (
        <div className="p-4 border rounded-md bg-background space-y-3">
            {suggestions.minimumMatchRating && (
            <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Min. Match Rating:</h5>
                <Badge variant="secondary" className="text-xs">{suggestions.minimumMatchRating}</Badge>
            </div>
            )}
            {suggestions.motivations && suggestions.motivations.length > 0 && (
            <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Motivations:</h5>
                <div className="flex flex-wrap gap-1.5">
                {suggestions.motivations.map((m: UserMotivation) => <Badge key={m} variant="secondary" className="text-xs">{motivationTextMap[m] || m}</Badge>)}
                </div>
            </div>
            )}
            {suggestions.locationPreference && (
            <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Location:</h5>
                <Badge variant="secondary" className="text-xs">
                {suggestions.locationPreference.isSensitive ? `Sensitive (${suggestions.locationPreference.notes || 'Notes unavailable'})` : 'Flexible'}
                </Badge>
            </div>
            )}
            {suggestions.tradeTimingPreference && (
            <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Trade Timing:</h5>
                <Badge variant="secondary" className="text-xs">{tradeTimingTextMap[suggestions.tradeTimingPreference] || suggestions.tradeTimingPreference}</Badge>
            </div>
            )}
            {suggestions.interestedInThirdPartyFulfillment !== undefined && (
            <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">3rd Party Fulfillment:</h5>
                <Badge variant="secondary" className="text-xs">{suggestions.interestedInThirdPartyFulfillment ? 'Likely Open' : 'Likely Prefers Direct'}</Badge>
            </div>
            )}
             {currentInsights.confidence && (
            <div className="pt-2">
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">AI Confidence: <Badge variant="outline" className="ml-1 py-0 px-1.5 text-[0.65rem]">{currentInsights.confidence}</Badge></h5>
                {currentInsights.reasoning && <p className="text-xs italic text-muted-foreground">{currentInsights.reasoning}</p>}
            </div>
            )}
        </div>
    );
  };

  if (isLoadingUsers) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-3">
                <Brain className="h-6 w-6 text-accent" />
                Live AI Preference Inference (Admin View)
            </CardTitle>
            <CardDescription className="font-body">
                Select a user to see AI-inferred trading preferences based on their structured activity data.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading users from Firestore...</p>
        </CardContent>
      </Card>
    );
  }

  if (allUsers.length === 0 && !isLoadingUsers) {
     return (
      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-3">
                <Users className="h-6 w-6 text-destructive" />
                 No Users Found
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">No users were found in Firestore. Please use the <Link href="/admin/data" className="text-primary hover:underline">Admin Data Management page</Link> to load dummy data.</p>
        </CardContent>
      </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent" />
          Live AI Preference Inference (Admin View)
        </CardTitle>
        <CardDescription className="font-body">
          Select a user to see AI-inferred trading preferences based on their structured activity data from Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label htmlFor="user-select-insights" className="text-sm font-medium font-headline block mb-1">Select User to Analyze:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoadingInsights || isLoadingUsers}>
                <SelectTrigger id="user-select-insights" className="w-full md:w-[300px]">
                    <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                    {allUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                                <UserIconLucide className="h-4 w-4 text-muted-foreground" />
                                {user.name} ({user.id})
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedUser && (
                <Button variant="link" asChild className="text-xs p-0 h-auto">
                    <Link href={`/profile/${selectedUser.id}`} target="_blank">View {selectedUser.name}'s Profile</Link>
                </Button>
            )}
        </div>
        
        <Separator />

        {!selectedUser ? (
            <p className="text-muted-foreground text-center py-4">Please select a user to see insights.</p>
        ) : (
        <>
            <Collapsible open={showActivityData} onOpenChange={setShowActivityData}>
            <div className="space-y-2">
                <p className="text-sm font-body text-muted-foreground">
                The AI infers preferences by analyzing structured activity data like the JSON below, generated from the user's items (from Firestore), current profile settings, and simulated interactions.
                </p>
                <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left">
                    <span className="flex-grow">{showActivityData ? 'Hide' : 'Show'} Generated Activity Data for {selectedUser.name}</span>
                    {showActivityData ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
                </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4 space-y-2">
                <div className="p-3 bg-muted/30 rounded-md border">
                <h4 className="font-headline text-[0.9rem] mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground"/>
                    Structured Input for AI ({selectedUser.name})
                </h4>
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                    {activityInputForAI ? JSON.stringify(activityInputForAI, null, 2) : "Generating data or waiting for user/item selection..."}
                </pre>
                </div>
            </CollapsibleContent>
            </Collapsible>

            <Separator/>

            <div>
            <h4 className="font-headline text-md mb-2">Live AI Preference Inference for {selectedUser.name}:</h4>
            {renderInsights()}
            <p className="text-xs text-muted-foreground font-body italic mt-3">
                The flow <code className="text-xs bg-muted p-0.5 rounded-sm">inferUserPreferencesFlow</code> is called to perform this inference.
            </p>
            </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
