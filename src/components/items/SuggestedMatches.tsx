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
            setAiReasoning("No other items available in the system to suggest matches for.");
            setSuggestedItems([]);
            setLoading(false);
            return;
        }

        const inputForFlow = {
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

        if (result.reasoning) {
            setAiReasoning(result.reasoning);
            // Only show a success/analysis toast if items were actually suggested AND reasoning doesn't indicate an error
            const reasoningIsError = result.reasoning.toLowerCase().includes('error') || 
                                     result.reasoning.toLowerCase().includes('overloaded') ||
                                     result.reasoning.toLowerCase().includes('could not process');
            if (matchedItems.length > 0 && !reasoningIsError) {
                toast({
                    title: "Trade Suggestions Analyzed",
                    description: result.reasoning,
                    duration: 7000, 
                });
            } else if (reasoningIsError && matchedItems.length === 0) {
              // If reasoning indicates an error and no items, it's an AI-side issue
              // This message will be displayed in the card content by aiReasoning state
            }
        }

      } catch (err: any) {
        console.error("Failed to fetch item matches from flow:", err);
        setFetchError("Could not load suggestions due to a system error. Please try again later.");
        toast({
            title: "Suggestion System Error",
            description: "Failed to connect to the AI suggestion service.",
            variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, [currentItem, toast]);

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

  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-destructive">Suggestion Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive font-body">{fetchError}</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestedItems.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Potential Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body">
            {aiReasoning || "No specific AI-powered matches found at this moment. Happy browsing!"}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (suggestedItems.length > 0 && !fetchError && !loading) {
    return (
        <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Suggested Matches for {currentItem.name}
            </CardTitle>
             {aiReasoning && !aiReasoning.toLowerCase().includes('error') && !aiReasoning.toLowerCase().includes('overloaded') && (
                <p className="text-sm text-muted-foreground mt-1 font-body">{aiReasoning}</p>
             )}
        </CardHeader>
        <CardContent>
            <ItemList items={suggestedItems} />
        </CardContent>
        </Card>
    );
  }

  return null;
}
