
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
  const [suggestedItemsWithScores, setSuggestedItemsWithScores] = useState<(Item & { matchScore: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setFetchError(null);
      setAiReasoning(null);
      setSuggestedItemsWithScores([]); // Clear previous suggestions

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
            setSuggestedItemsWithScores([]);
            setLoading(false);
            return;
        }

        const inputForFlow = {
          triggeringUserId: currentItem.ownerId, 
          currentItem: {
            id: currentItem.id,
            name: currentItem.name,
            description: currentItem.description,
            category: currentItem.category,
          },
          availableItems: otherAvailableItems,
        };

        const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);
        
        const matchedItems = result.suggestedMatches.map(match => {
          const item = dummyItems.find(dItem => dItem.id === match.itemId);
          return item ? { ...item, matchScore: match.matchScore } : null;
        }).filter(Boolean) as (Item & { matchScore: string })[]; // Type assertion

        setSuggestedItemsWithScores(matchedItems);

        if (result.reasoning) {
            setAiReasoning(result.reasoning);
        }
        
        const reasoningIsErrorOrSystemMessage = result.reasoning && (
            result.reasoning.toLowerCase().includes('error') || 
            result.reasoning.toLowerCase().includes('overloaded') ||
            result.reasoning.toLowerCase().includes('could not process') ||
            result.reasoning.toLowerCase().includes('usage limit') ||
            result.reasoning.toLowerCase().includes('no other items available') ||
            result.reasoning.toLowerCase().includes('ai assistant could not generate suggestions')
        );

        if (matchedItems.length > 0 && result.reasoning && !reasoningIsErrorOrSystemMessage) {
            toast({
                title: "Trade Suggestions Analyzed",
                description: result.reasoning,
                duration: 7000, 
            });
        }

      } catch (err: any) {
        console.error("Failed to fetch item matches from flow (client-side catch):", err);
        const clientErrorMsg = "Could not load suggestions due to a system error. Please try again later.";
        setFetchError(clientErrorMsg);
        setAiReasoning(clientErrorMsg); 
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
  }, [currentItem.id]); // Simplified dependencies, ensure currentItem itself triggers refetch if its properties change.

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
  
  if ((suggestedItemsWithScores.length === 0 && aiReasoning) || fetchError) {
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
  
  if (suggestedItemsWithScores.length > 0 && !fetchError && !loading) {
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
            <ItemList items={suggestedItemsWithScores} />
        </CardContent>
        </Card>
    );
  }

  return null; 
}
