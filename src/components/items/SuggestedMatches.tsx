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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      setError(null);
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

        if (result.reasoning && matchedItems.length > 0) {
            toast({
                title: "Trade Suggestions Analyzed",
                description: result.reasoning,
                duration: 7000, 
            });
        }

      } catch (err) {
        console.error("Failed to fetch item matches:", err);
        setError("Could not load suggestions at this time.");
        toast({
            title: "Error",
            description: "Failed to fetch item suggestions from AI.",
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-destructive">Suggestion Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground font-body">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestedItems.length === 0 && !loading) { // Ensure not to show this during initial load
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Potential Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body">No specific AI-powered matches found at this moment. Happy browsing!</p>
        </CardContent>
      </Card>
    );
  }
  
  // Only render this if there are items and no error, and not loading
  if (suggestedItems.length > 0 && !error && !loading) {
    return (
        <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Suggested Matches for {currentItem.name}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <ItemList items={suggestedItems} />
        </CardContent>
        </Card>
    );
  }

  return null; // Fallback, should ideally be covered by above states
}
