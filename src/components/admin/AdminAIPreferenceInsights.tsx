
"use client";

import { useState, useEffect } from 'react';
import type { User, Item, UserMotivation, TradeTimingPreference, InferUserPreferencesOutput as RealInferUserPreferencesOutput } from '@/types'; // Renamed to avoid conflict if types are identical
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import { inferUserPreferences, type InferUserPreferencesInput } from '@/ai/flows/infer-user-preferences-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Brain, ChevronDown, ChevronUp, UserCircle as UserIconLucide, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

// Type alias for clarity if src/types and flow types diverge, for now they are compatible
type AIPreferenceSuggestions = RealInferUserPreferencesOutput['suggestedPreferences'];


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

const generateActivitySummaryForUser = (user?: User): string => {
  if (!user) return "No user selected to generate activity summary.";
  let summary = `Activity Analysis Target for ${user.name} (ID: ${user.id}):\n`;
  const userItems = dummyItems.filter(i => i.ownerId === user.id);
  const offers = userItems.filter(i => i.listingType === 'offer' && (i.status === 'available' || i.status === 'pending')).slice(0, 2);
  const wants = userItems.filter(i => i.listingType === 'want' && (i.status === 'available' || i.status === 'pending')).slice(0, 1);

  if (offers.length > 0) {
    summary += "\nOffers Listed by User:\n";
    offers.forEach(item => {
      summary += `- "${item.name}" (Category: ${item.category}, Description: "...${item.description.substring(0, 30)}...")\n`;
    });
  }
  if (wants.length > 0) {
    summary += "\nWants Listed by User:\n";
    wants.forEach(item => {
      summary += `- "${item.name}" (Seeking in ${item.category}, Description: "...${item.description.substring(0, 30)}...")\n`;
    });
  }

  // Add some mock chat snippets based on user ID for variety
    if (user.id === 'user1') { // Alice
      summary += "\nSample Chat Snippets:\n- \"Happy to ship smaller items if needed! Let's build a friendly trading community.\"\n- \"Mainly looking for unique vintage pieces, not so worried about value maximization.\"";
    } else if (user.id === 'user2') { // Bob
      summary += "\nSample Chat Snippets:\n- \"Prefer local pickup for electronics to ensure everything is as described.\"\n- \"Only interested in direct trades for now. What's the best offer you have?\"";
    } else if (user.id === 'user3') { // Charlie
        summary += "\nSample Chat Snippets:\n- \"Quick and easy trades are best for me, happy to help others out!\"\n- \"Open to different kinds of offers, especially for my sustainable goods.\"";
    } else { 
      summary += "\nSample Chat Snippets:\n- \"Let's make a fair deal that works for both of us.\"\n- \"Open to discussing details to make the trade smooth.\"";
    }
  return summary.trim();
};


export default function AdminAIPreferenceInsights() {
  const [selectedUserId, setSelectedUserId] = useState<string>(dummyUsers[0]?.id || '');
  const [showSampleActivity, setShowSampleActivity] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [currentInsights, setCurrentInsights] = useState<RealInferUserPreferencesOutput | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedUser = dummyUsers.find(u => u.id === selectedUserId);
  const activitySummaryForAI = generateActivitySummaryForUser(selectedUser); // Generated once per selectedUser change

  useEffect(() => {
    if (!selectedUserId || !selectedUser) {
      setCurrentInsights(null);
      setInsightsError(null);
      return;
    }

    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      setCurrentInsights(null);
      setInsightsError(null);

      try {
        const input: InferUserPreferencesInput = {
          userId: selectedUser.id,
          activitySummary: activitySummaryForAI,
        };
        const result: RealInferUserPreferencesOutput = await inferUserPreferences(input);
        
        if (result.errorMessage) {
            setInsightsError(result.errorMessage);
            toast({ title: "AI Preference Inference Warning", description: result.errorMessage, variant: "default", duration: 7000 });
        } else if (!result.suggestedPreferences) {
            const errMsg = "AI did not return preference suggestions.";
            setInsightsError(errMsg);
            toast({ title: "AI Preference Inference Issue", description: errMsg, variant: "default", duration: 7000 });
        }
        setCurrentInsights(result);

      } catch (error: any) {
        console.error("Error fetching real AI preference insights:", error);
        const errMsg = "Failed to fetch AI preference insights. " + (error.message || "Check console for details.");
        setInsightsError(errMsg);
        toast({ title: "AI System Error", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoadingInsights(false);
      }
    };

    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, selectedUser]); // activitySummaryForAI is stable if selectedUser is stable


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
        <div className="p-4 border border-destructive bg-destructive/10 rounded-md text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
                <p className="font-semibold">Error Fetching Insights:</p>
                <p className="text-xs">{insightsError}</p>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent" />
          Live AI Preference Inference (Admin View)
        </CardTitle>
        <CardDescription className="font-body">
          Select a user to see AI-inferred trading preferences based on their (mock-generated) activity summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label htmlFor="user-select-insights" className="text-sm font-medium font-headline block mb-1">Select User to Analyze:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoadingInsights}>
                <SelectTrigger id="user-select-insights" className="w-full md:w-[300px]">
                    <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                    {dummyUsers.map(user => (
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
            <Collapsible open={showSampleActivity} onOpenChange={setShowSampleActivity}>
            <div className="space-y-2">
                <p className="text-sm font-body text-muted-foreground">
                The AI infers preferences by analyzing an activity summary like the one below.
                </p>
                <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left">
                    <span className="flex-grow">{showSampleActivity ? 'Hide' : 'Show'} Sample Activity Data for {selectedUser.name}</span>
                    {showSampleActivity ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
                </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4 space-y-2">
                <div className="p-3 bg-muted/30 rounded-md border">
                <h4 className="font-headline text-[0.9rem] mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground"/>
                    Activity Summary Input for AI ({selectedUser.name})
                </h4>
                <pre className="text-xs font-code whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                    {activitySummaryForAI}
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
