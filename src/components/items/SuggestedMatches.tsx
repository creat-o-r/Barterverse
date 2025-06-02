
'use client';

import { useEffect, useState } from 'react';
import type { Item } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import ItemList from '@/components/items/ItemList';
import { dummyItems, dummyUsers } from '@/lib/dummy-data'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
// Removed useToast as reasoning will be inline
// import { useToast } from "@/hooks/use-toast";

interface SuggestedMatchesProps {
  currentItem: Item;
}

export default function SuggestedMatches({ currentItem }: SuggestedMatchesProps) {
  const [suggestedItemsWithScores, setSuggestedItemsWithScores] = useState<(Item & { matchScore: string; isThirdPartyFulfillment?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  // const { toast } = useToast(); // Removed

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setFetchError(null);
      setAiReasoning(null);
      setSuggestedItemsWithScores([]); 

      if (!currentItem?.id) {
          setLoading(false);
          const missingItemError = "Cannot fetch suggestions: current item information is missing.";
          setAiReasoning(missingItemError);
          setFetchError(missingItemError);
          return;
      }
      
      const viewingUserId = dummyUsers[0].id; 

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
        }));

        if (otherAvailableItems.length === 0) {
            const noItemsReasoning = `No other items currently available from different users to suggest matches for ${currentItem.listingType === 'want' ? 'this want' : 'your item'} "${currentItem.name}".`;
            setAiReasoning(noItemsReasoning);
            setSuggestedItemsWithScores([]);
            setLoading(false);
            return;
        }

        const inputForFlow = {
          triggeringUserId: viewingUserId, 
          currentItem: {
            id: currentItem.id,
            name: currentItem.name,
            description: currentItem.description,
            category: currentItem.category,
            ownerId: currentItem.ownerId,
            listingType: currentItem.listingType,
          },
          availableItems: otherAvailableItems,
        };

        const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);
        
        const augmentedMatchedItems = (result.suggestedMatches || []).map(match => {
          const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
          if (!itemDetails) return null;

          let isThirdPartyFulfillment = false;
          if (
            currentItem.listingType === 'want' &&
            itemDetails.listingType === 'offer' && // Only badge offers fulfilling a want
            match.ownerId !== viewingUserId &&
            match.ownerId !== currentItem.ownerId
          ) {
            isThirdPartyFulfillment = true;
          }

          return { ...itemDetails, matchScore: match.matchScore, isThirdPartyFulfillment };
        }).filter(Boolean) as (Item & { matchScore: string; isThirdPartyFulfillment?: boolean })[];

        setSuggestedItemsWithScores(augmentedMatchedItems);
        setAiReasoning(result.reasoning || null);
        
        // Check if the reasoning is actually an error/system message that shouldn't be toasted as "success"
        const reasoningIsErrorOrSystemMessage = result.reasoning && (
            result.reasoning.toLowerCase().includes('error') || 
            result.reasoning.toLowerCase().includes('overloaded') ||
            result.reasoning.toLowerCase().includes('could not process') ||
            result.reasoning.toLowerCase().includes('could not generate') ||
            result.reasoning.toLowerCase().includes('usage limit') ||
            result.reasoning.toLowerCase().includes('no other items available')
        );

        if (augmentedMatchedItems.length === 0 && result.reasoning && !reasoningIsErrorOrSystemMessage) {
             // If no items but reasoning is not an error, set it for display
             setAiReasoning(result.reasoning || (currentItem.listingType === 'offer' ? "No specific AI-powered matches found for this item right now." : "No specific AI-powered fulfillments found for this want right now."));
        } else if (result.reasoning && reasoningIsErrorOrSystemMessage) {
            // If reasoning indicates an error or system constraint, set it as fetchError for prominent display
            setFetchError(result.reasoning);
        }


      } catch (err: any) {
        console.error("Failed to fetch item matches from flow (client-side catch):", err);
        const clientErrorMsg = "Could not load suggestions due to a system error. Please try again later.";
        setFetchError(clientErrorMsg);
        setAiReasoning(clientErrorMsg); 
        // Removed toast for client-side error too, it will be displayed inline
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem.id, currentItem.name, currentItem.listingType, currentItem.ownerId]);


  const cardTitle = currentItem.listingType === 'offer' 
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
  
  // Display error prominently if fetchError is set
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
            {aiReasoning || fetchError} {/* Display aiReasoning if it contains the error message */}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Display no suggestions found (with reasoning if available)
  if (suggestedItemsWithScores.length === 0) {
     return (
      <Card className="border-border border-dashed">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
             {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground text-center py-4">
            {aiReasoning || (currentItem.listingType === 'offer' ? "No specific AI-powered matches found at this moment." : "No specific AI-powered fulfillments found for this want at this moment.")}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Display suggestions with reasoning in header
  return (
      <Card>
      <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
           {cardTitle}
          </CardTitle>
           {aiReasoning && ( // Display reasoning if available and no overriding fetchError
              <p className="text-sm text-muted-foreground mt-1 font-body">{aiReasoning}</p>
           )}
      </CardHeader>
      <CardContent>
          <ItemList items={suggestedItemsWithScores} />
      </CardContent>
      </Card>
  );
}

