
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
import { MessageSquare, ArrowRightLeft, Eye, Gift, Search, Package, Star, PackageSearch, PackagePlus, Handshake, Settings, Loader2, AlertCircle, Link2 } from 'lucide-react';
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

// Helper function to find reciprocal items
function findReciprocalItems(
  contextItem: Item,
  otherUserId: string,
  allItems: Item[]
): Item[] {
  const MAX_RECIPROCAL_ITEMS = 2;
  const potentialReciprocals: Item[] = [];

  if (contextItem.listingType === 'offer') {
    potentialReciprocals.push(
      ...allItems.filter(
        (item) =>
          item.ownerId === otherUserId &&
          item.listingType === 'want' &&
          item.category === contextItem.category &&
          item.status === 'available' &&
          item.id !== contextItem.id
      )
    );
  } else { // contextItem.listingType === 'want'
    potentialReciprocals.push(
      ...allItems.filter(
        (item) =>
          item.ownerId === otherUserId &&
          item.listingType === 'offer' &&
          item.category === contextItem.category &&
          item.status === 'available' &&
          item.id !== contextItem.id
      )
    );
  }
  return potentialReciprocals.slice(0, MAX_RECIPROCAL_ITEMS);
}

// Reciprocal Item Display
function ReciprocalItemDisplay({ items, contextUserName, itemPerspective }: { items: Item[], contextUserName: string, itemPerspective: "offer" | "want" }) {
  if (!items || items.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <p className="text-xs text-muted-foreground italic">
          {contextUserName} has no specific {itemPerspective === 'offer' ? 'wants' : 'offers'} listed in this category right now.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
        {contextUserName} also {itemPerspective === 'offer' ? 'wants' : 'offers'}:
      </h4>
      <div className="space-y-1">
        {items.map(item => (
          <Link key={item.id} href={`/items/${item.id}`} className="block group">
            <Badge
              variant="outline"
              className="text-xs font-normal w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item.listingType === 'offer' ? <PackagePlus className="h-3 w-3 mr-1.5 text-green-600" /> : <PackageSearch className="h-3 w-3 mr-1.5 text-blue-600" />}
              <span className="truncate group-hover:underline">{item.name}</span>
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Main Item display component for this page
function OpportunityItemCard({
    item,
    owner,
    label,
    reciprocalItems,
    reciprocalContextUserName
}: {
    item: Item;
    owner: User;
    label: string;
    reciprocalItems: Item[];
    reciprocalContextUserName: string;
}) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
            {item.listingType === 'offer' ? <Gift className="h-5 w-5 text-green-600" /> : <Search className="h-5 w-5 text-blue-600" />}
            <CardTitle className="font-headline text-xl line-clamp-2">{item.name}</CardTitle>
        </div>
        <Badge variant="secondary" className="text-sm font-body py-1 px-1.5 inline-block self-start">{label}</Badge>
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
        <div className="flex items-center gap-2">
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
      <CardFooter className="flex-col items-stretch gap-2 pt-4">
        <ReciprocalItemDisplay
            items={reciprocalItems}
            contextUserName={reciprocalContextUserName}
            itemPerspective={item.listingType}
        />
        <Button asChild variant="outline" size="sm" className="mt-3">
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
  const [panelOpen, setPanelOpen] = useState(false); // Default to closed for better initial view

  const currentViewingUser = dummyUsers[0];

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

  if (!mainItem) return null; // Should not happen if called correctly

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="mt-4 border-t pt-4">
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
              Test the AI matching logic with different settings for this specific item. This panel's mode setting is illustrative; the flow uses global mode.
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

  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User; reciprocalItems: Item[] } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User; reciprocalItems: Item[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = dummyUsers[0].id;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const mainDetailsPromise = getItemAndOwner(mainItemId);
      const suggestedDetailsPromise = getItemAndOwner(suggestedItemId);

      const [mainD, suggestedD] = await Promise.all([mainDetailsPromise, suggestedDetailsPromise]);

      if (mainD && suggestedD) {
        const reciprocalForMain = findReciprocalItems(mainD.item, suggestedD.owner.id, dummyItems);
        const reciprocalForSuggested = findReciprocalItems(suggestedD.item, mainD.owner.id, dummyItems);

        setMainItemDetails({ ...mainD, reciprocalItems: reciprocalForMain });
        setSuggestedItemDetails({ ...suggestD, reciprocalItems: reciprocalForSuggested });
      } else {
        setMainItemDetails(null);
        setSuggestedItemDetails(null);
      }
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

  const { item: mainItem, owner: mainItemOwner, reciprocalItems: mainReciprocal } = mainItemDetails;
  const { item: suggestedItem, owner: suggestedItemOwner, reciprocalItems: suggestedReciprocal } = suggestedItemDetails;

  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;

  let mainItemDisplayLabel = "Context Item";
  if (mainItem.ownerId === currentUserId) {
    mainItemDisplayLabel = mainItem.listingType === 'offer' ? "Your Offer" : "Your Want";
  } else {
    mainItemDisplayLabel = mainItem.listingType === 'offer' ? `${mainItemOwner.name}'s Offer` : `${mainItemOwner.name}'s Want`;
  }

  let suggestedItemDisplayLabel = "Matching Item";
   if (suggestedItem.ownerId === currentUserId) {
    suggestedItemDisplayLabel = suggestedItem.listingType === 'offer' ? "Your Matching Offer" : "Your Matching Want";
  } else {
    suggestedItemDisplayLabel = suggestedItem.listingType === 'offer' ? `Matching Offer from ${suggestedItemOwner.name}` : `Matching Want from ${suggestedItemOwner.name}`;
  }

  if (mainItem.ownerId === currentUserId && suggestedItem.ownerId !== currentUserId) {
    tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
    if (mainItem.listingType === 'offer' && suggestedItem.listingType === 'offer') {
        chatButtonText = `Offer Your "${mainItem.name}" for Their "${suggestedItem.name}"`;
    } else if (mainItem.listingType === 'offer' && suggestedItem.listingType === 'want') {
        chatButtonText = `Offer Your "${mainItem.name}" to Fulfill Their Want`;
    } else {
        chatButtonText = `Discuss Your Want with ${suggestedItemOwner.name} for Their "${suggestedItem.name}"`;
    }
  } else if (mainItem.ownerId !== currentUserId && suggestedItem.ownerId === currentUserId) {
    tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${currentUserId}`;
     if (mainItem.listingType === 'offer' && suggestedItem.listingType === 'offer') {
        chatButtonText = `Discuss ${mainItemOwner.name}'s "${mainItem.name}" for Your "${suggestedItem.name}"`;
    } else if (mainItem.listingType === 'want' && suggestedItem.listingType === 'offer') {
        chatButtonText = `Discuss Fulfilling ${mainItemOwner.name}'s Want with Your "${suggestedItem.name}"`;
    } else {
        chatButtonText = `Discuss ${mainItemOwner.name}'s Want for Your Item`;
    }
  } else if (mainItem.ownerId !== currentUserId && suggestedItem.ownerId !== currentUserId) {
    tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
    chatButtonText = `Suggest ${mainItemOwner.name}'s "${mainItem.name}" for ${suggestedItemOwner.name}'s Item`;
  } else {
      negotiationContextValid = false;
      chatButtonText = "View Items for Details";
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center">
          <Handshake className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            AI suggests a potential match. Review the items and their reciprocal interests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="hidden md:flex items-center justify-center my-2 md:my-4">
              <ArrowRightLeft className="h-10 w-10 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 items-start">
            {/* Main Item Card and its Admin Panel */}
            <div className="flex flex-col">
              <OpportunityItemCard
                  item={mainItem}
                  owner={mainItemOwner}
                  label={mainItemDisplayLabel}
                  reciprocalItems={mainReciprocal}
                  reciprocalContextUserName={suggestedItemOwner.name}
              />
              {mainItem && <TemporaryAdminMatchTestPanel mainItem={mainItem} />}
            </div>

            {/* Suggested Item Card */}
            <OpportunityItemCard
                item={suggestedItem}
                owner={suggestedItemOwner}
                label={suggestedItemDisplayLabel}
                reciprocalItems={suggestedReciprocal}
                reciprocalContextUserName={mainItemOwner.name}
            />
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
                        This opportunity may involve items from multiple other users or a different trade dynamic.
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
      {/* The global TestPanel was here, it is now moved inside the main item's card rendering logic. */}
    </div>
  );
}
