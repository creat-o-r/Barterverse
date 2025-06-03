
'use client';

import { useEffect, useState } from 'react';
import type { Item } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import ItemList from '@/components/items/ItemList';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SuggestedMatchesProps {
  currentItem: Item;
}

export default function SuggestedMatches({ currentItem }: SuggestedMatchesProps) {
  const [suggestedItems, setSuggestedItems] = useState<(Item & { matchScore: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preferencesWereConsidered, setPreferencesWereConsidered] = useState<boolean>(false);
  const [matchModeUsed, setMatchModeUsed] = useState<'simple' | 'advanced' | undefined>(undefined);
  const [internalReasoning, setInternalReasoning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setFetchError(null);
      setInternalReasoning(null);
      setSuggestedItems([]);
      setPreferencesWereConsidered(false);
      setMatchModeUsed(undefined);

      if (!currentItem?.id) {
          setLoading(false);
          const missingItemError = "Cannot fetch suggestions: current item information is missing.";
          setInternalReasoning(missingItemError);
          setFetchError(missingItemError);
          return;
      }

      const viewingUser = dummyUsers[0];

      try {
        const otherAvailableItems = dummyItems.filter(
          (item) => item.id !== currentItem.id &&
                     (item.status === 'available' || item.status === 'pending')
        ).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            ownerId: item.ownerId,
            listingType: item.listingType,
            minimumMatchRatingOverride: item.minimumMatchRatingOverride, // Added this field
        }));

        if (otherAvailableItems.length === 0) {
            const noItemsReasoning = `No other items currently available from different users to suggest matches for ${currentItem.listingType === 'want' ? 'this want' : 'this item'} "${currentItem.name}".`;
            setInternalReasoning(noItemsReasoning);
            setSuggestedItems([]);
            setLoading(false);
            setMatchModeUsed('simple');
            return;
        }

        const inputForFlow = {
          triggeringUserId: viewingUser.id,
          currentItem: {
            id: currentItem.id,
            name: currentItem.name,
            description: currentItem.description,
            category: currentItem.category,
            ownerId: currentItem.ownerId,
            listingType: currentItem.listingType,
            minimumMatchRatingOverride: currentItem.minimumMatchRatingOverride, // Added this field
          },
          availableItems: otherAvailableItems,
        };

        const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);

        setPreferencesWereConsidered(result.preferencesConsidered || false);
        setMatchModeUsed(result.usedMatchingMode);

        const itemsWithScores = (result.suggestedMatches || []).map(match => {
          const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
          return itemDetails ? { ...itemDetails, matchScore: match.matchScore } : null;
        }).filter(Boolean) as (Item & { matchScore: string })[];

        setSuggestedItems(itemsWithScores);

        const reasoningIsErrorOrSystemMessage = result.reasoning && (
            result.reasoning.toLowerCase().includes('error') ||
            result.reasoning.toLowerCase().includes('overloaded') ||
            result.reasoning.toLowerCase().includes('could not process') ||
            result.reasoning.toLowerCase().includes('could not generate') ||
            result.reasoning.toLowerCase().includes('usage limit') ||
            result.reasoning.toLowerCase().includes('no other items available')
        );

        if (itemsWithScores.length === 0 && result.reasoning && !reasoningIsErrorOrSystemMessage) {
             setInternalReasoning(result.reasoning || (currentItem.listingType === 'offer' ? "No specific AI-powered matches found for this item right now." : "No specific AI-powered fulfillments found for this want right now."));
        } else if (result.reasoning && reasoningIsErrorOrSystemMessage) {
            setFetchError(result.reasoning);
            setInternalReasoning(result.reasoning);
        } else if (itemsWithScores.length > 0 && result.reasoning && !reasoningIsErrorOrSystemMessage){
            setInternalReasoning(result.reasoning);
        }


      } catch (err: any) {
        console.error("Failed to fetch item matches from flow (client-side catch):", err);
        const clientErrorMsg = "Could not load suggestions due to a system error. Please try again later.";
        setFetchError(clientErrorMsg);
        setInternalReasoning(clientErrorMsg);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem.id, currentItem.name, currentItem.listingType, currentItem.ownerId, currentItem.minimumMatchRatingOverride]);


  const cardTitleText = currentItem.listingType === 'offer'
    ? `AI Matches for ${currentItem.name}`
    : `AI Fulfillments for ${currentItem.name}`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            {currentItem.listingType === 'offer' ? "Finding Potential Matches..." : "Searching for Fulfillments..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body">Our AI is looking for great connections for you!</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="flex flex-col overflow-hidden h-full bg-muted/50">
                <div className="aspect-[4/3] bg-muted animate-pulse"></div>
                <CardContent className="p-4 flex-grow space-y-2">
                  <div className="h-5 bg-muted-foreground/20 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6 text-destructive" />
            Suggestion Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-destructive">
            {internalReasoning || fetchError}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestedItems.length === 0) {
     return (
      <Card className="border-border border-dashed">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              {cardTitleText}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              {matchModeUsed && <Badge variant="outline" className="capitalize">Mode: {matchModeUsed}</Badge>}
              <Badge variant={preferencesWereConsidered ? 'default' : 'secondary'}>Prefs: {preferencesWereConsidered ? 'On' : 'Off'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground text-center py-4">
            {internalReasoning && !fetchError ? internalReasoning : (currentItem.listingType === 'offer' ? "No specific AI-powered matches found at this moment." : "No specific AI-powered fulfillments found for this want at this moment.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card>
      <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                {cardTitleText}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
                {matchModeUsed && <Badge variant="outline" className="capitalize">Mode: {matchModeUsed}</Badge>}
                <Badge variant={preferencesWereConsidered ? 'default' : 'secondary'}>Prefs: {preferencesWereConsidered ? 'On' : 'Off'}</Badge>
            </div>
          </div>
      </CardHeader>
      <CardContent>
          <ItemList items={suggestedItems} mainContextItemId={currentItem.id} />
      </CardContent>
      </Card>
  );
}
