
"use client"; // Added "use client" directive

import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat, Gift, Search, HelpingHand, Settings, Loader2, AlertCircle, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
import SuggestedMatches from '@/components/items/SuggestedMatches';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { suggestMatchingItems, type ItemMatchInput, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import type { AIMatchingMode } from '@/services/ai-config-service';
import ItemList from '@/components/items/ItemList';
import { useState, useEffect } from 'react';


// Helper function to find item and owner (simulates data fetching)
async function getItemDetails(itemId: string): Promise<{ item: Item; owner: User } | null> {
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  return { item, owner };
}

// Temporary Admin Panel for testing matching logic FOR THIS ITEM
function TemporaryAdminMatchTestPanel({ itemToTest }: { itemToTest: Item | null }) {
  const [testMatchingMode, setTestMatchingMode] = useState<AIMatchingMode>('simple');
  const [testUseUserPrefs, setTestUseUserPrefs] = useState(false);
  const [testSuggestions, setTestSuggestions] = useState<(Item & { matchScore: string })[]>([]);
  const [testReasoning, setTestReasoning] = useState<string | null>(null);
  const [testPrefsConsidered, setTestPrefsConsidered] = useState<boolean>(false);
  const [testModeUsed, setTestModeUsed] = useState<AIMatchingMode | undefined>(undefined);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const currentViewingUser = dummyUsers[0];

  const handleRunTestSuggestions = async () => {
    if (!itemToTest) {
      setTestError("Item to test not available.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestSuggestions([]);
    setTestReasoning(null);
    setTestModeUsed(undefined);
    setTestPrefsConsidered(false);

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
      };

      // The simplified item-match-flow ignores testUseUserPrefs and testMatchingMode.
      // This panel primarily observes the current (simple) flow's behavior.
      const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);

      setTestPrefsConsidered(result.preferencesConsidered);
      setTestModeUsed(result.usedMatchingMode);

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
    <Card className="mt-8 border-dashed border-primary/50">
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="w-full">
        <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-left mb-0 py-3 px-4 hover:bg-primary/10">
                <span className="font-headline text-md flex items-center gap-2 text-primary">
                    <Settings className="h-5 w-5" />
                    Admin: Test AI Suggestions for &quot;{itemToTest.name}&quot;
                </span>
                <span className="text-xs">{panelOpen ? "Hide Panel" : "Show Panel"}</span>
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 space-y-4 border-t border-dashed border-primary/30">
            <CardDescription className="text-xs font-body mb-2">
              Test the AI matching logic specifically for this item. Note: The underlying flow is currently simplified and may not use all test parameters.
            </CardDescription>
            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <Switch
                id={`test-mode-switch-${itemToTest.id}`}
                checked={testMatchingMode === 'advanced'}
                onCheckedChange={(checked) => setTestMatchingMode(checked ? 'advanced' : 'simple')}
                disabled={true}
              />
              <Label htmlFor={`test-mode-switch-${itemToTest.id}`} className="font-headline text-sm">Use Advanced Matching (Currently Ignored by Flow)</Label>
            </div>
            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <Switch
                id={`test-prefs-switch-${itemToTest.id}`}
                checked={testUseUserPrefs}
                onCheckedChange={setTestUseUserPrefs}
                disabled={true}
              />
              <Label htmlFor={`test-prefs-switch-${itemToTest.id}`} className="font-headline text-sm">Consider User Profile Preferences (Currently Ignored by Flow)</Label>
            </div>
            <Button onClick={handleRunTestSuggestions} disabled={testLoading || !itemToTest} size="sm">
              {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Run Test AI Suggestions
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
                <p className="text-xs text-muted-foreground">AI Matching Mode Used: <Badge variant={testModeUsed === 'advanced' ? "default" : "secondary"}>{testModeUsed || 'N/A'}</Badge></p>
                {testSuggestions.length > 0 ? (
                  <ItemList items={testSuggestions} />
                ) : (
                  <p className="text-sm text-muted-foreground">No items suggested by this test run.</p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
    </Collapsible>
    </Card>
  );
}


export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const itemDetails = await getItemDetails(params.id);

  if (!itemDetails) {
    return <div className="text-center py-10 font-body">Item not found.</div>;
  }

  const { item, owner } = itemDetails;
  const isCurrentUserOwner = item.ownerId === dummyUsers[0].id; // Assuming dummyUsers[0] is current user

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="p-0 relative">
              <div className="aspect-video relative w-full">
                <Image
                  src={item.imageUrl || 'https://placehold.co/800x450.png'}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={item.dataAiHint || "item image detail"}
                />
                 <Badge
                    variant={item.listingType === 'offer' ? 'default' : 'secondary'}
                    className={`absolute top-4 left-4 text-lg p-2 capitalize z-10 ${item.listingType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    {item.listingType === 'offer' ? <Gift className="h-5 w-5 mr-1.5" /> : <Search className="h-5 w-5 mr-1.5" />}
                    {item.listingType}
                  </Badge>
                {item.status !== 'available' && (
                  <Badge
                    variant={item.status === 'traded' ? 'destructive' : 'secondary'}
                    className="absolute top-4 right-4 text-lg p-2 capitalize z-10"
                  >
                    {item.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <CardTitle className="text-3xl font-headline mb-2">{item.name}</CardTitle>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-sm">{item.category}</Badge>
              </div>
              <h3 className="font-headline text-xl mt-6 mb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Description
              </h3>
              <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <UserCircle className="h-6 w-6 text-primary" />
                {item.listingType === 'offer' ? "Owner Details" : "Listed By"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"} />
                  <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/profile/${owner.id}`} className="font-headline text-lg hover:text-primary">{owner.name}</Link>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400" />
                    {owner.rating.toFixed(1)} ({owner.tradesCompleted} trades)
                  </div>
                </div>
              </div>
              {owner.bio && <p className="text-sm font-body text-muted-foreground italic">{owner.bio}</p>}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                  <Link href={`/profile/${owner.id}`}>View Profile</Link>
              </Button>
            </CardFooter>
          </Card>

          {!isCurrentUserOwner && item.status === 'available' && item.listingType === 'offer' && (
            <Card>
              <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Repeat className="h-6 w-6 text-primary" />
                  Interested in this item?
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <ItemTradeInitiationContent item={item} ownerName={owner.name} ownerId={owner.id} />
              </CardContent>
            </Card>
          )}

          {!isCurrentUserOwner && item.status === 'available' && item.listingType === 'want' && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <HelpingHand className="h-6 w-6 text-primary" />
                  Can you fulfill this want?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-body text-muted-foreground mb-4">
                  If you have an item that matches "{item.name}" which {owner.name} is looking for, you can initiate a discussion.
                </p>
                <ItemTradeInitiationContent item={item} ownerName={owner.name} ownerId={owner.id} />
              </CardContent>
            </Card>
          )}

          {item.status === 'pending' && (
              <Card className="border-yellow-500">
                  <CardHeader>
                      <CardTitle className="font-headline text-xl text-yellow-600">
                        {item.listingType === 'offer' ? "Trade Pending" : "Fulfillment Pending"}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="font-body text-yellow-700">
                        {item.listingType === 'offer'
                          ? "This item is currently part of a pending trade negotiation."
                          : "This want listing is currently in discussion for fulfillment."
                        }
                      </p>
                  </CardContent>
              </Card>
          )}
          {item.status === 'traded' && (
              <Card className="border-red-500">
                  <CardHeader>
                      <CardTitle className="font-headline text-xl text-red-600">
                        {item.listingType === 'offer' ? "Item Traded" : "Want Fulfilled"}
                        </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="font-body text-red-700">
                        {item.listingType === 'offer'
                          ? "This item has already been traded."
                          : "This want listing has been successfully fulfilled."
                        }
                      </p>
                  </CardContent>
              </Card>
          )}
        </div>
      </div>

      {/* AI Suggested Matches/Fulfillments (only if not owner and item available) */}
      {!isCurrentUserOwner && item.status === 'available' && (
        <div className="mt-12">
          <Separator className="my-8" />
          <SuggestedMatches currentItem={item} />
        </div>
      )}

      {/* Admin Panel for testing AI suggestions for THIS item */}
      <TemporaryAdminMatchTestPanel itemToTest={item} />
    </>
  );
}
