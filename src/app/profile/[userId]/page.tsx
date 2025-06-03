
"use client";

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { dummyUsers, dummyItems, updateUserPreferencesInDummyData } from '@/lib/dummy-data';
import type { User, Item, UserMotivation, TradeTimingPreference } from '@/types';
import { inferUserPreferences, type InferUserPreferencesInput, type InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { getEnableAutomaticPreferenceInference } from '@/services/ai-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Handshake, Lightbulb, Wand2, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


async function getUserProfile(userId: string): Promise<User | null> {
  const actualUserId = userId === 'me' ? dummyUsers[0].id : userId;
  const user = dummyUsers.find((u) => u.id === actualUserId);
  if (!user) return null;
  user.items = dummyItems.filter(item => item.ownerId === user.id);
  return JSON.parse(JSON.stringify(user));
}

const motivationTextMap: Record<UserMotivation, string> = { 'help-others': 'Helping Others', 'maximize-trades': 'Maximizing Trades', 'convenience-focused': 'Convenience', 'community-building': 'Community Building', 'unique-finds': 'Finding Unique Items', };
const tradeTimingTextMap: Record<TradeTimingPreference, string> = { 'simultaneous': 'Prefers Simultaneous', 'staged': 'Open to Staged Trades', 'flexible': 'Flexible Timing', };


// Updated to generate more dynamic summary based on user's current preferences
const generateMockActivitySummaryForUser = (user: User | null): string => {
  if (!user) return "No user data available to generate activity summary.";
  let summary = `Activity Analysis for ${user.name} (ID: ${user.id}) to refine preferences:\n`;
  const userItems = dummyItems.filter(i => i.ownerId === user.id);
  const offers = userItems.filter(i => i.listingType === 'offer' && (i.status === 'available' || i.status === 'pending')).slice(0, 3);
  const wants = userItems.filter(i => i.listingType === 'want' && (i.status === 'available' || i.status === 'pending')).slice(0, 2);

  if (offers.length > 0) {
    summary += "\nRecent Offers Listed:\n";
    offers.forEach(item => { summary += `- "${item.name}" (Category: ${item.category}, Desc: "...${item.description.substring(0, 50)}...")\n`; });
  }
  if (wants.length > 0) {
    summary += "\nRecent Wants Listed:\n";
    wants.forEach(item => { summary += `- "${item.name}" (Seeking in ${item.category}, Desc: "...${item.description.substring(0, 50)}...")\n`; });
  }
  
  summary += "\nContext from Current Profile Settings (for AI refinement):\n";
  if (user.motivations && user.motivations.length > 0) {
    summary += `- Currently expressed motivations: ${user.motivations.map(m => motivationTextMap[m] || m).join(', ')}.\n`;
  }
  if (user.locationPreference) {
    summary += `- Current location preference: ${user.locationPreference.isSensitive ? 'Sensitive' : 'Flexible'}. ${user.locationPreference.notes ? `Details: "${user.locationPreference.notes}"` : ''}\n`;
  }
  if (user.tradeTimingPreference) {
    summary += `- Current preferred trade timing: ${tradeTimingTextMap[user.tradeTimingPreference] || user.tradeTimingPreference}.\n`;
  }
  if (user.interestedInThirdPartyFulfillment !== undefined) {
    summary += `- Current interest in 3rd party fulfillment: ${user.interestedInThirdPartyFulfillment ? 'Yes' : 'No'}.\n`;
  }
  if (!user.motivations?.length && !user.locationPreference && !user.tradeTimingPreference && user.interestedInThirdPartyFulfillment === undefined) {
    summary += "- User has not specified detailed trading preferences yet. AI should analyze overall activity.\n";
  } else {
    summary += "- User has some explicit preferences set; AI can use these as a baseline for refinement.\n"
  }
  
  if (user.tradesCompleted > 5) {
     summary += "- User has a history of completed trades, suggesting engagement.\n";
  }
  summary += "- User is actively seeking to update/refine their preferences via AI.\n";
  return summary.trim();
};


const RatingStarsDisplay = ({ score, count }: { score: number, count?: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => ( <Star key={i} className={`h-5 w-5 ${i < Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /> ))}
    <span className="ml-2 text-sm text-muted-foreground">{score.toFixed(1)} {count ? `(${count} ratings)` : ''}</span>
  </div>
);

export default function UserProfilePage({ params: paramsProp }: { params: { userId: string } }) {
  const params = use(paramsProp); 
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowAutoPreferenceInference, setAllowAutoPreferenceInference] = useState(false);
  const [isLearningPreferences, setIsLearningPreferences] = useState(false);
  const [showActivityForAI, setShowActivityForAI] = useState(false);
  const [activitySummaryForAI, setActivitySummaryForAI] = useState<string>('');
  const { toast } = useToast();

  const currentViewingUserId = dummyUsers[0].id; 
  const isOwnProfile = params.userId === 'me' || params.userId === currentViewingUserId;

  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true);
      const profile = await getUserProfile(params.userId);
      setUser(profile);
      if (isOwnProfile) {
        const allowInference = await getEnableAutomaticPreferenceInference();
        setAllowAutoPreferenceInference(allowInference);
        if (profile) {
            setActivitySummaryForAI(generateMockActivitySummaryForUser(profile));
        }
      }
      setLoading(false);
    }
    if (params.userId) {
        loadUserProfile();
    }
  }, [params.userId, isOwnProfile]); 

  const handleLearnPreferences = async () => {
    if (!user) return;
    setIsLearningPreferences(true);
    const currentActivitySummary = generateMockActivitySummaryForUser(user); // Generate fresh summary
    setActivitySummaryForAI(currentActivitySummary); // Update for display if collapsible is open

    try {
      const input: InferUserPreferencesInput = { userId: user.id, activitySummary: currentActivitySummary };
      const result: InferUserPreferencesOutput = await inferUserPreferences(input);

      if (result.errorMessage || !result.suggestedPreferences) {
        toast({ title: "AI Preference Learning Error", description: result.errorMessage || "Could not infer preferences.", variant: "destructive" });
      } else {
        const updateSuccess = updateUserPreferencesInDummyData(user.id, result.suggestedPreferences);
        if (updateSuccess) {
          const updatedProfile = await getUserProfile(user.id);
          setUser(updatedProfile); 
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
    return <div className="text-center py-10 font-body">Loading profile...</div>;
  }
  if (!user) {
    return <div className="text-center py-10 font-body">User not found.</div>;
  }

  const offeredItems = user.items.filter(item => item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending'));
  const wantedItems = user.items.filter(item => item.listingType === 'want' && (item.status === 'available' || item.status === 'pending'));
  const tradedOrFulfilledItems = user.items.filter(item => item.status === 'traded');

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
          <div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground"/>3rd Party Fulfillments:</h4><Badge variant={user.interestedInThirdPartyFulfillment ? "default" : "secondary"} className="text-xs">{user.interestedInThirdPartyFulfillment ? "Open to it" : "Prefers direct trades"}</Badge></div>
          {user.motivations && user.motivations.length > 0 && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-muted-foreground"/>Motivations:</h4><div className="flex flex-wrap gap-1.5">{user.motivations.map(motivation => (<Badge key={motivation} variant="outline" className="text-xs">{motivationTextMap[motivation] || motivation}</Badge>))}</div></div>)}
          {user.locationPreference && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/>Location Preference:</h4><Badge variant={user.locationPreference.isSensitive ? "secondary" : "outline"} className="text-xs">{user.locationPreference.isSensitive ? "Location Sensitive" : "Location Flexible"}</Badge>{user.locationPreference.isSensitive && user.locationPreference.notes && (<p className="text-xs text-muted-foreground font-body italic mt-1">{user.locationPreference.notes}</p>)}</div>)}
          {user.tradeTimingPreference && (<div><h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/>Trade Timing:</h4><Badge variant="outline" className="text-xs">{tradeTimingTextMap[user.tradeTimingPreference] || user.tradeTimingPreference}</Badge></div>)}
          {(!user.motivations || user.motivations.length === 0) && !user.locationPreference && !user.tradeTimingPreference && (<p className="text-sm text-muted-foreground font-body">No specific preferences set yet.</p>)}
        
          {isOwnProfile && allowAutoPreferenceInference && (
            <Collapsible open={showActivityForAI} onOpenChange={setShowActivityForAI} className="mt-4">
                 <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-left text-xs text-muted-foreground hover:text-foreground">
                        <span>{showActivityForAI ? 'Hide' : 'Show'} Activity Summary Sent to AI for Preference Update</span>
                        {showActivityForAI ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                    <div className="p-3 bg-muted/30 rounded-md border">
                    <h4 className="font-headline text-xs mb-1.5 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground"/>
                        Activity Summary for AI
                    </h4>
                    <pre className="text-xs font-code whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                        {activitySummaryForAI || "No activity summary generated yet."}
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
      <section><h2 className="text-2xl font-headline mb-4">Trade & Fulfillment History ({tradedOrFulfilledItems.length})</h2>{tradedOrFulfilledItems.length > 0 ? <ItemList items={tradedOrFulfilledItems} /> : <p className="text-muted-foreground font-body">No completed trades or fulfilled wants yet.</p>}</section>
      <Separator />
      <section><h2 className="text-2xl font-headline mb-4">User Reviews & Ratings</h2><Card><CardContent className="p-6"><p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p></CardContent></Card></section>
    </div>
  );
}
