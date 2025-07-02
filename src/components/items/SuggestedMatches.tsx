
'use client';

import { useEffect, useState } from 'react';
import type { Item, User } from '@/types'; // Added User
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import ItemList from '@/components/items/ItemList';
// import { dummyItems, dummyUsers } from '@/lib/dummy-data'; // Replaced
import { getAllItems } from '@/lib/firebase/firestoreUtils'; // getUser no longer needed if just using ID
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AIMatchingMode } from '@/services/ai-config-service';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import Link from 'next/link'; // Import Link for sign-in prompt


interface SuggestedMatchesProps {
  currentItem: Item;
}

const FLOW_TIMEOUT_MS = 30000; // 30 seconds

export default function SuggestedMatches({ currentItem }: SuggestedMatchesProps) {
  const [suggestedItems, setSuggestedItems] = useState<(Item & { matchScore: string; reciprocalItemId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preferencesWereConsidered, setPreferencesWereConsidered] = useState<boolean>(false);
  const [matchModeUsed, setMatchModeUsed] = useState<AIMatchingMode | undefined>(undefined);
  const [internalReasoning, setInternalReasoning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setFetchError(null);
      setInternalReasoning(null);
      setSuggestedItems([]);
      setPreferencesWereConsidered(false);
      setMatchModeUsed(undefined);

      if (!currentItem?.id) {
          const missingItemError = "Cannot fetch suggestions: current item information is missing.";
          setInternalReasoning(missingItemError);
          setFetchError(missingItemError);
          toast({ title: "Suggestion Error", description: missingItemError, variant: "destructive" });
          setLoading(false);
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
            // minimumMatchRatingOverride: item.minimumMatchRatingOverride, // Removed
            isGiftItForward: item.isGiftItForward,
            openToAnyOpportunity: item.openToAnyOpportunity, // Added
        }));

        if (otherAvailableItems.length === 0) {
            const noItemsReasoning = `No other items currently available from different users to suggest matches for ${currentItem.listingType === 'want' ? 'this want' : 'this item'} "${currentItem.name}".`;
            setInternalReasoning(noItemsReasoning);
            setSuggestedItems([]);
            setMatchModeUsed('simple');
            setLoading(false);
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
            // minimumMatchRatingOverride: currentItem.minimumMatchRatingOverride, // Removed
            isGiftItForward: currentItem.isGiftItForward,
            openToAnyOpportunity: currentItem.openToAnyOpportunity, // Added
          },
          availableItems: otherAvailableItems,
        };

        const flowPromise = suggestMatchingItems(inputForFlow);
        const timeoutPromise = new Promise<ItemMatchOutput>((_, reject) =>
            setTimeout(() => reject(new Error("AI_SUGGESTION_TIMEOUT")), FLOW_TIMEOUT_MS)
        );

        const result: ItemMatchOutput = await Promise.race([flowPromise, timeoutPromise]);

        setPreferencesWereConsidered(result.preferencesConsidered || false);
        setMatchModeUsed(result.usedMatchingMode);

        const itemsWithScores = (result.suggestedMatches || []).map(match => {
          const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
          return itemDetails ? {
            ...itemDetails,
            matchScore: match.matchScore,
            isGiftItForward: match.isGiftItForward || itemDetails.isGiftItForward,
            reciprocalItemId: match.reciprocalItemId
          } : null;
        }).filter(Boolean) as (Item & { matchScore: string; reciprocalItemId?: string })[];

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
            toast({ title: "AI Suggestion Issue", description: result.reasoning, variant: "default", duration: 7000 });
        } else if (itemsWithScores.length > 0 && result.reasoning && !reasoningIsErrorOrSystemMessage){
            setInternalReasoning(result.reasoning);
        }


      } catch (err: any) {
        console.error("Failed to fetch item matches (client-side catch):", err);
        let clientErrorMsg = "Could not load suggestions due to a system error. Please try again later.";
        let toastSeverity: "destructive" | "default" = "destructive";

        if (err.message === "AI_SUGGESTION_TIMEOUT") {
            clientErrorMsg = "The AI is taking a bit too long to find matches for this item. You can try again or check back later.";
            setInternalReasoning(`AI suggestion for "${currentItem.name}" timed out after ${FLOW_TIMEOUT_MS / 1000} seconds.`);
            toastSeverity = "default";
        } else {
            setInternalReasoning(err.message || clientErrorMsg);
        }

        setFetchError(clientErrorMsg);
        toast({ title: "Suggestion Error", description: clientErrorMsg, variant: toastSeverity, duration: 7000 });

      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem.id, currentItem.name, currentItem.listingType, currentItem.ownerId, /* currentItem.minimumMatchRatingOverride removed */ currentItem.isGiftItForward, currentItem.openToAnyOpportunity]);


  const cardTitleText = currentItem.listingType === 'offer'
    ? currentItem.isGiftItForward ? `AI: Who Might Want Your Gift "${currentItem.name}"?` : `AI Matches for ${currentItem.name}`
    : `AI Fulfillments for ${currentItem.name}`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            {currentItem.listingType === 'offer' ? (currentItem.isGiftItForward ? "Finding Potential Recipients..." : "Finding Potential Matches...") : "Searching for Fulfillments..."}
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
              <Badge variant={preferencesWereConsidered ? 'default' : 'secondary'}>Prefs: {preferencesWereConsidered ? 'Yes' : 'No'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground text-center py-4">
            {internalReasoning && !fetchError ? internalReasoning : (currentItem.listingType === 'offer' ? (currentItem.isGiftItForward ? "No specific 'want' items found that your gift could fulfill right now." : "No specific AI-powered matches found at this moment.") : "No specific AI-powered fulfillments found for this want at this moment.")}
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
          <ItemList
            items={suggestedItems}
            mainContextItemId={currentItem.id}
            usedMatchingMode={matchModeUsed}
            preferencesConsidered={preferencesWereConsidered}
          />
      </CardContent>
      </Card>
  );
}
