
// src/app/opportunities/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types'; // UserProfilePreferences removed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ArrowRightLeft, Eye, Gift, Search, Star, Settings, Loader2, AlertCircle, Link2, Handshake, PackagePlus, PackageSearch } from 'lucide-react'; // Handshake, PackagePlus, PackageSearch added
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { suggestMatchingItems, type ItemMatchInput, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import type { AIMatchingMode } from '@/services/ai-config-service';
import ItemList from '@/components/items/ItemList';

// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  return { item, owner };
}

// Helper to find reciprocal items (simplified: same category)
function findReciprocalItems(contextItem: Item, otherUserId: string, allItems: Item[]): Item[] {
  const reciprocalItems: Item[] = [];
  if (!contextItem || !otherUserId) return reciprocalItems;

  const potentialMatches = allItems.filter(
    (item) =>
      item.ownerId === otherUserId && // Item belongs to the other user
      item.id !== contextItem.id && // Not the context item itself
      (item.status === 'available' || item.status === 'pending') && // Is available or pending
      item.category === contextItem.category // Simplified: matches category
  );

  if (contextItem.listingType === 'offer') {
    // If contextItem is an offer, look for 'want' items from the other user
    reciprocalItems.push(...potentialMatches.filter(pm => pm.listingType === 'want').slice(0, 2));
  } else if (contextItem.listingType === 'want') {
    // If contextItem is a want, look for 'offer' items from the other user
    reciprocalItems.push(...potentialMatches.filter(pm => pm.listingType === 'offer').slice(0, 2));
  }
  return reciprocalItems.slice(0,2); // Max 2 reciprocal items
}


// Component to display a single reciprocal item concisely
function ReciprocalItemDisplay({ items, contextUserName, itemPerspective }: { items: Item[], contextUserName: string, itemPerspective: 'offer' | 'want' }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground italic mt-1">No direct reciprocal {itemPerspective === 'offer' ? 'wants' : 'offers'} found in this category from {contextUserName}.</p>;
  }
  return (
    <div className="mt-2">
      <h4 className="text-xs font-semibold text-muted-foreground mb-1">
        {contextUserName} also {itemPerspective === 'offer' ? 'wants' : 'offers'}:
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <Button key={item.id} variant="outline" size="sm" asChild className="h-auto px-2 py-1 text-xs">
            <Link href={`/items/${item.id}`} title={item.name}>
              {item.listingType === 'offer' ? <PackagePlus className="h-3 w-3 mr-1" /> : <PackageSearch className="h-3 w-3 mr-1" />}
              <span className="truncate max-w-[100px]">{item.name}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}


// Display component for each item in the opportunity
function OpportunityItemCard({
    item,
    owner,
    opportunityContextLabel, // e.g., "Your Offer", "Their Matching Want"
    reciprocalItems,
    reciprocalContextUserName,
}: {
    item: Item;
    owner: User;
    opportunityContextLabel: string;
    reciprocalItems: Item[];
    reciprocalContextUserName: string;
}) {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-xl line-clamp-2 flex items-center gap-2">
            {item.listingType === 'offer' ? <Gift className="h-5 w-5 text-green-600 shrink-0" /> : <Search className="h-5 w-5 text-blue-600 shrink-0" />}
            {item.name}
        </CardTitle>
        <Badge variant="secondary" className="text-xs py-0.5 px-2 w-fit">{opportunityContextLabel}</Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0">
        <div className="aspect-video relative w-full rounded-md overflow-hidden border">
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
      <CardFooter className="flex-col items-stretch gap-2 pt-3 border-t">
        <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90">
          <Link href={`/items/${item.id}`}><Eye className="mr-2 h-4 w-4" /> View Full Details</Link>
        </Button>
        <div className="border-t border-dashed pt-2 mt-2">
             <ReciprocalItemDisplay items={reciprocalItems} contextUserName={reciprocalContextUserName} itemPerspective={item.listingType} />
        </div>
      </CardFooter>
    </Card>
  );
}

// Temporary Admin Panel for testing matching logic
function TemporaryAdminMatchTestPanel({ itemToTest }: { itemToTest: Item | null }) {
  const [testMatchingMode, setTestMatchingMode] = useState<AIMatchingMode>('simple'); // Default to simple
  const [testUseUserPrefs, setTestUseUserPrefs] = useState(false); // Default to false
  const [testSuggestions, setTestSuggestions] = useState<(Item & { matchScore: string })[]>([]);
  const [testReasoning, setTestReasoning] = useState<string | null>(null);
  const [testPrefsConsidered, setTestPrefsConsidered] = useState<boolean>(false);
  const [testModeUsed, setTestModeUsed] = useState<AIMatchingMode>('simple');
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const currentViewingUser = dummyUsers[0]; // Simulate current user

  const handleRunTestSuggestions = async () => {
    if (!itemToTest) {
      setTestError("Item to test not available.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestSuggestions([]);
    setTestReasoning(null);
    setTestModeUsed(testMatchingMode); // Log the mode we intend to test with
    setTestPrefsConsidered(false); // Will be updated by flow if it considers them

    const otherAvailableItems = dummyItems.filter(
      (item) => item.id !== itemToTest.id &&
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
      // NOTE: The simplified item-match-flow will ignore testUseUserPrefs and testMatchingMode effectively.
      // This panel is now more for observing the simple flow's behavior for this item.
      const inputForFlow: ItemMatchInput = {
        triggeringUserId: currentViewingUser.id,
        currentItem: {
          id: itemToTest.id,
          name: itemToTest.name,
          description: itemToTest.description,
          category: itemToTest.category,
          ownerId: itemToTest.ownerId,
          listingType: itemToTest.listingType,
        },
        availableItems: otherAvailableItems,
        // Preferences are no longer part of the simplified ItemMatchInput
      };

      const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);

      setTestPrefsConsidered(result.preferencesConsidered); // Should be false from simplified flow
      setTestModeUsed(result.usedMatchingMode); // Should be 'simple' from simplified flow

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

  if (!itemToTest) return null;

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="mt-4 border-t pt-4 w-full">
        <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left mb-2">
                <span className="font-headline text-sm flex items-center gap-2 text-muted-foreground">
                    <Settings className="h-4 w-4" />
                    Admin: Test AI Suggestions for &quot;{itemToTest.name}&quot;
                </span>
                <span>{panelOpen ? "Hide" : "Show"} Panel</span>
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border rounded-md bg-muted/30 space-y-4">
            <CardDescription className="text-xs font-body mb-2">
              Test the simplified AI matching logic for this specific item.
              The flow now always runs in 'simple' mode and does not use user preferences.
            </CardDescription>
            {/* Controls are illustrative as flow is simplified */}
            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <Switch
                id={`test-mode-switch-${itemToTest.id}`}
                checked={testMatchingMode === 'advanced'}
                onCheckedChange={(checked) => setTestMatchingMode(checked ? 'advanced' : 'simple')}
                disabled={true} 
              />
              <Label htmlFor={`test-mode-switch-${itemToTest.id}`} className="font-headline text-sm">Use Advanced Matching (Ignored)</Label>
            </div>
            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <Switch
                id={`test-prefs-switch-${itemToTest.id}`}
                checked={testUseUserPrefs}
                onCheckedChange={setTestUseUserPrefs}
                disabled={true}
              />
              <Label htmlFor={`test-prefs-switch-${itemToTest.id}`} className="font-headline text-sm">Consider User Profile Preferences (Ignored)</Label>
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
                <p className="text-xs text-muted-foreground">AI Preferences Considered: <Badge variant={testPrefsConsidered ? "default" : "secondary"}>{testPrefsConsidered ? 'Yes' : 'No'}</Badge></p>
                <p className="text-xs text-muted-foreground">AI Matching Mode Used: <Badge variant={testModeUsed === 'advanced' ? "default" : "secondary"}>{testModeUsed}</Badge></p>
                {testSuggestions.length > 0 ? (
                  <ItemList items={testSuggestions} />
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
  const mainItemIdQuery = searchParams.get('mainItemId');
  const suggestedItemIdQuery = searchParams.get('suggestedItemId');

  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User; reciprocalItems: Item[] } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User; reciprocalItems: Item[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = dummyUsers[0].id; // Simulate current user

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const mainD = await getItemAndOwner(mainItemIdQuery);
      const suggestedD = await getItemAndOwner(suggestedItemIdQuery);

      if (mainD && suggestedD) {
        const mainReciprocal = findReciprocalItems(mainD.item, suggestedD.owner.id, dummyItems);
        const suggestedReciprocal = findReciprocalItems(suggestedD.item, mainD.owner.id, dummyItems);
        setMainItemDetails({ ...mainD, reciprocalItems: mainReciprocal });
        setSuggestedItemDetails({ ...suggestedD, reciprocalItems: suggestedReciprocal });
      } else {
        setMainItemDetails(null);
        setSuggestedItemDetails(null);
      }
      setLoading(false);
    }
    if (mainItemIdQuery && suggestedItemIdQuery) {
        fetchData();
    } else {
        setLoading(false);
    }
  }, [mainItemIdQuery, suggestedItemIdQuery]);

  if (loading) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading opportunity details...</div>;
  }

  if (!mainItemDetails || !suggestedItemDetails) {
    return <div className="text-center py-10 font-body text-destructive">Could not load opportunity. Items may be invalid or no longer available. Ensure both mainItemId and suggestedItemId are provided.</div>;
  }

  const { item: mainItem, owner: mainItemOwner, reciprocalItems: mainReciprocal } = mainItemDetails;
  const { item: suggestedItem, owner: suggestedItemOwner, reciprocalItems: suggestedReciprocal } = suggestedItemDetails;

  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;
  let mainItemOpportunityLabel = '';
  let suggestedItemOpportunityLabel = '';

  if (mainItem.ownerId === currentUserId) {
    mainItemOpportunityLabel = `Your ${mainItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
    if (suggestedItem.listingType === 'want') {
      suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s Matching Want`;
      tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`; // Current user offering mainItem FOR suggestedItem (which is a want)
      chatButtonText = `Offer your "${mainItem.name}" for their want: "${suggestedItem.name}"`;
    } else { // suggestedItem is an offer
      suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s Matching Offer`;
      tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`; // Current user wants suggestedItem (offer) and might give mainItem
      chatButtonText = `Negotiate for "${suggestedItem.name}" (Offering your "${mainItem.name}")`;
    }
  } else if (suggestedItem.ownerId === currentUserId) { // Main item is other's, suggested is current user's
    suggestedItemOpportunityLabel = `Your ${suggestedItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
     if (mainItem.listingType === 'want') {
      mainItemOpportunityLabel = `${mainItemOwner.name}'s Matching Want`;
      tradeId = `trade-${suggestedItem.ownerId}-wants-${mainItem.id}-from-${mainItem.ownerId}`; // Main item owner wants (mainItem), current user offers suggestedItem
      chatButtonText = `Offer your "${suggestedItem.name}" for their want: "${mainItem.name}"`;
    } else { // mainItem is an offer
      mainItemOpportunityLabel = `${mainItemOwner.name}'s Matching Offer`;
      tradeId = `trade-${currentUserId}-wants-${mainItem.id}-from-${mainItem.ownerId}`; // Current user wants mainItem (offer)
      chatButtonText = `Negotiate for "${mainItem.name}" (Offering your "${suggestedItem.name}")`;
    }
  } else { // Both items owned by others (current user is viewer)
    mainItemOpportunityLabel = `${mainItemOwner.name}'s ${mainItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
    suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s ${suggestedItem.listingType === 'offer' ? 'Matching Offer' : 'Matching Want'}`;
    // This case is more complex for tradeId, implies brokering. Simplification:
    tradeId = `discuss-${mainItem.id}-with-${suggestedItem.id}`;
    chatButtonText = `Discuss This Opportunity`;
    // negotiationContextValid = false; // Could disable direct negotiation if no ownership
  }
   if (mainItem.ownerId === currentUserId && suggestedItem.ownerId === currentUserId) {
    negotiationContextValid = false; // User owns both, no trade with another
    chatButtonText = "View Items Separately";
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center pb-4">
          <Handshake className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            AI suggests a potential match. Explore the details and see if it's a fit!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="hidden md:flex items-center justify-center my-4">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 items-start">
            {/* Context Item Card */}
            <div className="flex flex-col">
              <OpportunityItemCard
                  item={mainItem}
                  owner={mainItemOwner}
                  opportunityContextLabel={mainItemOpportunityLabel}
                  reciprocalItems={mainReciprocal}
                  reciprocalContextUserName={suggestedItemOwner.name}
              />
            </div>

            {/* Suggested Item Card */}
             <div className="flex flex-col">
              <OpportunityItemCard
                  item={suggestedItem}
                  owner={suggestedItemOwner}
                  opportunityContextLabel={suggestedItemOpportunityLabel}
                  reciprocalItems={suggestedReciprocal}
                  reciprocalContextUserName={mainItemOwner.name}
              />
            </div>
          </div>
          <Separator className="my-6 md:my-8" />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-3">Ready to Discuss?</h3>
            {negotiationContextValid && tradeId ? (
                 <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-base">
                    <Link href={`/trades/${tradeId}`}>
                        <MessageSquare className="mr-2 h-5 w-5" /> {chatButtonText}
                    </Link>
                </Button>
            ) : (
                <div className="space-y-2">
                    <p className="text-muted-foreground font-body">
                        This opportunity may involve items from multiple other users or your own items where direct negotiation isn't straightforward from this view.
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
      {/* Admin Panel, associated with the main item of the opportunity, appears after the main card section */}
      {mainItem && (
         <TemporaryAdminMatchTestPanel itemToTest={mainItem} />
      )}
    </div>
  );
}
