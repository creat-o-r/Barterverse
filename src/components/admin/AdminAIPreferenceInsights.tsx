
"use client";

import { useState, useEffect } from 'react';
import type { User, Item, UserMotivation, TradeTimingPreference } from '@/types';
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Brain, ChevronDown, ChevronUp, UserCircle as UserIconLucide } from 'lucide-react'; // Renamed UserCircle to avoid conflict
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

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

const generateMockActivitySummary = (user?: User): string => {
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

const getMockAISuggestions = (user?: User): any => {
  if (!user) return { confidence: 'Low', reasoning: 'No user selected.' };
  let suggestions: any = {
    motivations: ['convenience-focused'] as UserMotivation[],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'flexible' as TradeTimingPreference,
    interestedInThirdPartyFulfillment: true,
    confidence: 'Medium',
    reasoning: "General activity suggests a flexible approach to trading."
  };
    if (user.id === 'user1') {
        suggestions = {
            motivations: ['unique-finds', 'community-building'] as UserMotivation[],
            locationPreference: { isSensitive: false, notes: "Appears flexible with shipping." },
            tradeTimingPreference: 'flexible' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: true,
            confidence: 'High',
            reasoning: "Activity suggests a focus on unique items and positive community interactions. Mentions shipping."
        };
    } else if (user.id === 'user2') {
        suggestions = {
            motivations: ['maximize-trades'] as UserMotivation[],
            locationPreference: { isSensitive: true, notes: 'Strong preference for local pickup for electronics.' },
            tradeTimingPreference: 'simultaneous' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: false,
            confidence: 'High',
            reasoning: "User seems focused on item value, direct exchanges, and mentions local pickup preferences."
        };
    } else if (user.id === 'user3') {
        suggestions = {
            motivations: ['help-others', 'convenience-focused'] as UserMotivation[],
            locationPreference: { isSensitive: false },
            tradeTimingPreference: 'staged' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: true,
            confidence: 'Medium',
            reasoning: "Seems motivated by helping and convenience, likely open to staged trades."
        };
    }
  return suggestions;
};

export default function AdminAIPreferenceInsights() {
  const [selectedUserId, setSelectedUserId] = useState<string>(dummyUsers[0]?.id || '');
  const [showSampleActivity, setShowSampleActivity] = useState(false);

  const selectedUser = dummyUsers.find(u => u.id === selectedUserId);
  const mockActivitySummary = generateMockActivitySummary(selectedUser);
  const mockAISuggestions = getMockAISuggestions(selectedUser);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent" />
          AI Preference Insights (Experimental Admin View)
        </CardTitle>
        <CardDescription className="font-body">
          Demonstrates how AI might learn and suggest trading preferences based on user activity. This uses mock data for illustration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label htmlFor="user-select" className="text-sm font-medium font-headline block mb-1">Select User to View Insights:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select" className="w-full md:w-[300px]">
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
                AI can learn preferences by analyzing activity like item listings and chat interactions.
                </p>
                <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left">
                    <span className="flex-grow">{showSampleActivity ? 'Hide' : 'Show'} Sample Activity Data AI Might Use for {selectedUser.name}</span>
                    {showSampleActivity ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
                </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4 space-y-2">
                <div className="p-3 bg-muted/30 rounded-md border">
                <h4 className="font-headline text-[0.9rem] mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground"/>
                    Sample Activity Data for {selectedUser.name}
                </h4>
                <pre className="text-xs font-code whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                    {mockActivitySummary}
                </pre>
                </div>
            </CollapsibleContent>
            </Collapsible>

            <Separator/>

            <div>
            <h4 className="font-headline text-md mb-2">Simulated AI Preference Suggestions for {selectedUser.name}:</h4>
            <p className="text-sm font-body text-muted-foreground mb-3">
                Based on data like the sample above, AI might make these suggestions:
            </p>
            <div className="p-4 border rounded-md bg-background space-y-3">
                {mockAISuggestions.motivations && mockAISuggestions.motivations.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Motivations:</h5>
                    <div className="flex flex-wrap gap-1.5">
                    {mockAISuggestions.motivations.map((m: UserMotivation) => <Badge key={m} variant="secondary" className="text-xs">{motivationTextMap[m] || m}</Badge>)}
                    </div>
                </div>
                )}
                {mockAISuggestions.locationPreference && (
                <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Location:</h5>
                    <Badge variant="secondary" className="text-xs">
                    {mockAISuggestions.locationPreference.isSensitive ? `Sensitive (${mockAISuggestions.locationPreference.notes || 'Notes unavailable'})` : 'Flexible'}
                    </Badge>
                </div>
                )}
                {mockAISuggestions.tradeTimingPreference && (
                <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Trade Timing:</h5>
                    <Badge variant="secondary" className="text-xs">{tradeTimingTextMap[mockAISuggestions.tradeTimingPreference] || mockAISuggestions.tradeTimingPreference}</Badge>
                </div>
                )}
                {mockAISuggestions.interestedInThirdPartyFulfillment !== undefined && (
                <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">3rd Party Fulfillment:</h5>
                    <Badge variant="secondary" className="text-xs">{mockAISuggestions.interestedInThirdPartyFulfillment ? 'Likely Open' : 'Likely Prefers Direct'}</Badge>
                </div>
                )}
                {mockAISuggestions.confidence && (
                <div className="pt-2">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">AI Confidence: <Badge variant="outline" className="ml-1 py-0 px-1.5 text-[0.65rem]">{mockAISuggestions.confidence}</Badge></h5>
                    {mockAISuggestions.reasoning && <p className="text-xs italic text-muted-foreground">{mockAISuggestions.reasoning}</p>}
                </div>
                )}
            </div>
            <p className="text-xs text-muted-foreground font-body italic mt-3">
                These are illustrative examples. Actual AI-driven preference setting would involve ongoing learning and user confirmation (e.g., in an "Edit Profile" section).
                The flow <code className="text-xs bg-muted p-0.5 rounded-sm">inferUserPreferencesFlow</code> is designed to perform this kind of inference.
            </p>
            </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
