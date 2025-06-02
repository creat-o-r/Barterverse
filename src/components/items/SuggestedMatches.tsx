
'use client';

import { useEffect, useState } from 'react';
import type { Item } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import ItemList from '@/components/items/ItemList';
import { dummyItems } from '@/lib/dummy-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SuggestedMatchesProps {
  currentItem: Item;
}

export default function SuggestedMatches({ currentItem }: SuggestedMatchesProps) {
  const [suggestedItems, setSuggestedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setFetchError(null);
      setAiReasoning(null);
      setSuggestedItems([]); // Clear previous suggestions

      try {
        const otherAvailableItems = dummyItems.filter(
          (item) => item.id !== currentItem.id && (item.status === 'available' || item.status === 'pending')
        ).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category
        }));

        if (otherAvailableItems.length === 0) {
            const noItemsReasoning = "No other items available in the system to suggest matches for.";
            setAiReasoning(noItemsReasoning);
            setSuggestedItems([]);
            setLoading(false);
            return;
        }

        const inputForFlow = {
          triggeringUserId: currentItem.ownerId, // Pass the owner of the current item
          currentItem: {
            id: currentItem.id,
            name: currentItem.name,
            description: currentItem.description,
            category: currentItem.category,
          },
          availableItems: otherAvailableItems,
        };

        const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);
        
        const matchedItems = dummyItems.filter(item => result.suggestedItemIds.includes(item.id));
        setSuggestedItems(matchedItems);

        // Always set AI reasoning if provided, it might contain error messages from the flow
        if (result.reasoning) {
            setAiReasoning(result.reasoning);
        }
        
        // Determine if reasoning indicates an error or system issue
        const reasoningIsErrorOrSystemMessage = result.reasoning && (
            result.reasoning.toLowerCase().includes('error') || 
            result.reasoning.toLowerCase().includes('overloaded') ||
            result.reasoning.toLowerCase().includes('could not process') ||
            result.reasoning.toLowerCase().includes('usage limit') ||
            result.reasoning.toLowerCase().includes('no other items available') ||
            result.reasoning.toLowerCase().includes('ai assistant could not generate suggestions')
        );

        if (matchedItems.length > 0 && result.reasoning && !reasoningIsErrorOrSystemMessage) {
            // Only show a success/analysis toast if items were suggested AND reasoning is positive/analytical
            toast({
                title: "Trade Suggestions Analyzed",
                description: result.reasoning,
                duration: 7000, 
            });
        } else if (reasoningIsErrorOrSystemMessage) {
            // If reasoning indicates an error/issue, it's already set in aiReasoning to be displayed in the card.
            // No separate toast needed here as the card content will show the message.
        }


      } catch (err: any) {
        console.error("Failed to fetch item matches from flow (client-side catch):", err);
        const clientErrorMsg = "Could not load suggestions due to a system error. Please try again later.";
        setFetchError(clientErrorMsg);
        setAiReasoning(clientErrorMsg); // Show this in the card as well
        toast({
            title: "Suggestion System Error",
            description: "Failed to connect to the AI suggestion service.",
            variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (currentItem?.id) {
        fetchSuggestions();
    } else {
        setLoading(false);
        setAiReasoning("Cannot fetch suggestions without a current item.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem.id, currentItem.name, currentItem.description, currentItem.category, currentItem.ownerId, toast]); // Ensure all dependent properties of currentItem are listed

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            Finding Potential Matches...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body">Our AI is looking for great trades for you!</p>
        </CardContent>
      </Card>
    );
  }
  
  // Display reasoning or error message if no items or if fetchError occurred
  if ((suggestedItems.length === 0 && aiReasoning) || fetchError) {
    return (
      <Card className={fetchError ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className={`font-headline text-xl flex items-center gap-2 ${fetchError ? 'text-destructive' : ''}`}>
            <Sparkles className={`h-6 w-6 ${fetchError ? 'text-destructive': 'text-primary'}`} />
            {fetchError ? "Suggestion Error" : "Potential Matches"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-body ${fetchError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {aiReasoning || "No specific AI-powered matches found at this moment. Happy browsing!"}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Display suggested items
  if (suggestedItems.length > 0 && !fetchError && !loading) {
    return (
        <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Suggested Matches for {currentItem.name}
            </CardTitle>
             {aiReasoning && (
                <p className="text-sm text-muted-foreground mt-1 font-body">{aiReasoning}</p>
             )}
        </CardHeader>
        <CardContent>
            <ItemList items={suggestedItems} />
        </CardContent>
        </Card>
    );
  }

  return null; // Should not be reached if logic is correct
}
