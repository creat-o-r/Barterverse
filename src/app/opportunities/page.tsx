
// src/app/opportunities/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User, UserProfilePreferences } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ArrowRightLeft, Eye, Gift, Search, Star, Settings, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { suggestMatchingItems, type ItemMatchInput, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import type { AIMatchingMode } from '@/services/ai-config-service';
import ItemList from '@/components/items/ItemList'; // Re-using for admin panel

// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  return { item, owner };
}

// Simplified Item display component for this page
function OpportunityItemCard({
    item,
    owner,
}: {
    item: Item;
    owner: User;
}) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="font-headline text-xl line-clamp-2 flex items-center gap-2">
                {item.listingType === 'offer' ? <Gift className="h-5 w-5 text-green-600" /> : <Search className="h-5 w-5 text-blue-600" />}
                {item.name}
            </CardTitle>
            <Badge variant={item.listingType === 'offer' ? 'default' : 'secondary'} className="capitalize ml-2">
                {item.listingType}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="aspect-video relative w-full rounded-md overflow-hidden">
          <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint || "opportunity item"}
          />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 font-body">{item.description}</p>
        <div className="flex items-center gap-2 pt-2 border-t border-dashed">
          <Avatar className="h-8 w-8">
            <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"}/>
            <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Link href={`/profile/${owner.id}`} className="text-sm font-semibold hover:text-primary">{owner.name}</Link>
           <div className="flex items-center text-xs text-muted-foreground ml-auto">
            <Star className="h-3 w-3 mr-0.5 text-yellow-400 fill-yellow-400" />
            {owner.rating.toFixed(1)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 pt-4 border-t">
        <Button asChild variant="outline" size="sm">
          <Link href={`/items/${item.id}`}><Eye className="mr-2 h-4 w-4" /> View Full Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Temporary Admin Panel for testing matching logic
function TemporaryAdminMatchTestPanel({ mainItem }: { mainItem: Item | null }) {
  const [testMatchingMode, setTestMatchingMode] = useState<AIMatchingMode>('advanced');
  const [testUseUserPrefs, setTestUseUserPrefs] = useState(true);
  const [testSuggestions, setTestSuggestions] = useState<(Item & { matchScore: string })[]>([]);
  const [testReasoning, setTestReasoning] = useState<string | null>(null);
  const [testPrefsConsidered, setTestPrefsConsidered] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const currentViewingUser = dummyUsers[0]; // Simulate current user

  const handleRunTestSuggestions = async () => {
    if (!mainItem) {
      setTestError("Main item not available for testing.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestSuggestions([]);
    setTestReasoning(null);

    const viewingUserPreferences: UserProfilePreferences = {
      motivations: currentViewingUser.motivations,
      locationPreference: currentViewingUser.locationPreference,
      tradeTimingPreference: currentViewingUser.tradeTimingPreference,
      interestedInThirdPartyFulfillment: currentViewingUser.interestedInThirdPartyFulfillment,
    };

    const otherAvailableItems = dummyItems.filter(
      (item) => item.id !== mainItem.id &&
                 (item.status === 'available' || item.status === 'pending')
    ).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        ownerId: item.ownerId,
        listingType: item.listingType,
    }));

    try {
      const inputForFlow: ItemMatchInput = {
        triggeringUserId: currentViewingUser.id,
        currentItem: {
          id: mainItem.id,
          name: mainItem.name,
          description: mainItem.description,
          category: mainItem.category,
          ownerId: mainItem.ownerId,
          listingType: mainItem.listingType,
        },
        availableItems: otherAvailableItems,
        triggeringUserPreferences: testUseUserPrefs ? viewingUserPreferences : undefined,
      };

      const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);

      setTestPrefsConsidered(result.preferencesConsidered || false);
      const augmentedMatchedItems = (result.suggestedMatches || []).map(match => {
        const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
        return itemDetails ? { ...itemDetails, matchScore: match.matchScore } : null;
      }).filter(Boolean) as (Item & { matchScore: string })[];

      setTestSuggestions(augmentedMatchedItems);
      setTestReasoning(result.reasoning || "No specific reasoning provided by AI.");
      if (result.reasoning && (result.reasoning.toLowerCase().includes('error') || result.reasoning.toLowerCase().includes('could not process'))) {
        setTestError(result.reasoning);
      }

    } catch (err: any) {
      setTestError(err.message || "An unknown error occurred during test suggestion.");
    } finally {
      setTestLoading(false);
    }
  };

  if (!mainItem) return null;

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="mt-4 border-t pt-4 w-full">
        <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left mb-2">
                <span className="font-headline text-sm flex items-center gap-2 text-primary">
                    <Settings className="h-4 w-4" />
                    Admin: Test Matching for &quot;{mainItem.name}&quot;
                </span>
                <span>{panelOpen ? "Hide" : "Show"} Panel</span>
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border rounded-md bg-muted/30 space-y-4">
            <CardDescription className="text-xs font-body mb-2">
              Test the AI matching logic with different settings for this specific item.
            </CardDescription>
            <div className="flex items-center space-x-2">
              <Switch
                id={`test-mode-switch-${mainItem.id}`}
                checked={testMatchingMode === 'advanced'}
                onCheckedChange={(checked) => setTestMatchingMode(checked ? 'advanced' : 'simple')}
                disabled={testLoading}
              />
              <Label htmlFor={`test-mode-switch-${mainItem.id}`} className="font-headline text-sm">Use Advanced Matching (Illustrative)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`test-prefs-switch-${mainItem.id}`}
                checked={testUseUserPrefs}
                onCheckedChange={setTestUseUserPrefs}
                disabled={testLoading}
              />
              <Label htmlFor={`test-prefs-switch-${mainItem.id}`} className="font-headline text-sm">Consider User Profile Preferences</Label>
            </div>
            <Button onClick={handleRunTestSuggestions} disabled={testLoading} size="sm">
              {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Run Test Suggestion
            </Button>

            {testLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Fetching test suggestions...</p>}
            {testError && (
              <div className="p-3 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{testError}</p>
              </div>
            )}
            {!testLoading && !testError && (testSuggestions.length > 0 || testReasoning) && (
              <div className="mt-4 space-y-3">
                <h4 className="font-headline text-md">Test Results:</h4>
                {testReasoning && <p className="text-xs italic text-muted-foreground">Reasoning: {testReasoning}</p>}
                <p className="text-xs text-muted-foreground">Preferences Considered in this test run: <Badge variant={testPrefsConsidered ? "default" : "secondary"}>{testPrefsConsidered ? 'Yes' : 'No'}</Badge></p>
                <p className="text-xs text-muted-foreground">Illustrative Matching Mode for this test: <Badge variant={testMatchingMode === 'advanced' ? "default" : "secondary"}>{testMatchingMode}</Badge></p>
                {testSuggestions.length > 0 ? (
                  <ItemList items={testSuggestions} mainContextItemId={mainItem.id} />
                ) : (
                  <p className="text-sm text-muted-foreground">No items suggested by this test run.</p>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
    </Collapsible>
  );
}


export default function OpportunityMatchPage() {
  const searchParams = useSearchParams();
  const mainItemId = searchParams.get('mainItemId');
  const suggestedItemId = searchParams.get('suggestedItemId');

  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = dummyUsers[0].id; // Simulate current user

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const mainD = await getItemAndOwner(mainItemId);
      const suggestedD = await getItemAndOwner(suggestedItemId);

      setMainItemDetails(mainD);
      setSuggestedItemDetails(suggestedD);
      setLoading(false);
    }
    if (mainItemId && suggestedItemId) {
        fetchData();
    } else {
        setLoading(false);
    }
  }, [mainItemId, suggestedItemId]);

  if (loading) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading opportunity details...</div>;
  }

  if (!mainItemDetails || !suggestedItemDetails) {
    return <div className="text-center py-10 font-body text-destructive">Could not load opportunity. Items may be invalid or no longer available. Ensure both mainItemId and suggestedItemId are provided.</div>;
  }

  const { item: mainItem, owner: mainItemOwner } = mainItemDetails;
  const { item: suggestedItem, owner: suggestedItemOwner } = suggestedItemDetails;

  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;

  // Logic to determine who is offering what to whom for chat context
  // This assumes 'mainItem' is the item the current user owns or was viewing,
  // and 'suggestedItem' is the match.
  if (mainItem.ownerId === currentUserId && suggestedItem.ownerId !== currentUserId) {
    // Current user owns mainItem, is interested in suggestedItem from other user
    tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
    chatButtonText = `Negotiate Your "${mainItem.name}" for Their "${suggestedItem.name}"`;
  } else if (mainItem.ownerId !== currentUserId && suggestedItem.ownerId === currentUserId) {
    // MainItem is owned by other, current user owns suggestedItem (this case is less likely from AI suggestions flow)
    tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${currentUserId}`;
    chatButtonText = `Negotiate Their "${mainItem.name}" for Your "${suggestedItem.name}"`;
  } else if (mainItem.ownerId !== currentUserId && suggestedItem.ownerId !== currentUserId) {
    // Both items owned by others, current user is a third party viewer
    // This might be a "broker" scenario if we implement it. For now, just a generic chat.
    tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`; // A bit arbitrary for 3rd party
    chatButtonText = `Discuss ${mainItemOwner.name}'s Item & ${suggestedItemOwner.name}'s Item`;
     // Potentially disable direct negotiation if user doesn't own either
  } else { // Both items owned by current user - invalid scenario for a trade with another.
      negotiationContextValid = false;
      chatButtonText = "View Items Separately";
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center">
          <ArrowRightLeft className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            AI suggests a potential match between these two items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 items-start">
            {/* Main Item Card and its Admin Panel */}
            <div className="flex flex-col items-center"> {/* Added flex flex-col items-center */}
              <OpportunityItemCard
                  item={mainItem}
                  owner={mainItemOwner}
              />
              {/* Admin panel is now here, associated with mainItem */}
              <TemporaryAdminMatchTestPanel mainItem={mainItem} />
            </div>

            {/* Suggested Item Card */}
            <div className="flex flex-col items-center"> {/* Added flex flex-col items-center for consistency */}
              <OpportunityItemCard
                  item={suggestedItem}
                  owner={suggestedItemOwner}
              />
            </div>
          </div>
          <Separator className="my-6 md:my-8" />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-2">Next Steps</h3>
            {negotiationContextValid && tradeId ? (
                 <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/trades/${tradeId}`}>
                        <MessageSquare className="mr-2 h-5 w-5" /> {chatButtonText}
                    </Link>
                </Button>
            ) : (
                <div className="space-y-2">
                    <p className="text-muted-foreground font-body">
                        This opportunity may involve items from multiple other users or your own items.
                        Please visit the individual item pages to initiate contact or explore further.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button asChild><Link href={`/items/${mainItem.id}`}>View {mainItem.name}</Link></Button>
                        <Button asChild><Link href={`/items/${suggestedItem.id}`}>View {suggestedItem.name}</Link></Button>
                    </div>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

