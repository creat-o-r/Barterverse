
'use client';

import { useState, useEffect } from 'react';
import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  const [topMatchedItems, setTopMatchedItems] = useState<Item[]>([]);
  const [topMatchedReasoning, setTopMatchedReasoning] = useState<string | null>(null);
  const [loadingTopMatches, setLoadingTopMatches] = useState(true);
  const [userFirstItemNameForTitle, setUserFirstItemNameForTitle] = useState<string | null>(null);

  const allAvailableOrPendingItems = dummyItems.filter(item => item.status === 'available' || item.status === 'pending');

  useEffect(() => {
    async function fetchTopMatches() {
      setLoadingTopMatches(true);
      setTopMatchedItems([]);
      setTopMatchedReasoning(null);
      setUserFirstItemNameForTitle(null);

      const currentUser = dummyUsers[0]; // Simulate current user
      const userFirstAvailableItem = dummyItems.find(
        (item) => item.ownerId === currentUser.id && (item.status === 'available' || item.status === 'pending')
      );

      if (!userFirstAvailableItem) {
        setTopMatchedReasoning("List an item you own to see personalized matches here!");
        setLoadingTopMatches(false);
        return;
      }
      setUserFirstItemNameForTitle(userFirstAvailableItem.name);

      const otherAvailableItemsForMatching = dummyItems.filter(
        (item) => item.id !== userFirstAvailableItem.id && (item.status === 'available' || item.status === 'pending')
      ).map(item => ({ 
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
      }));

      if (otherAvailableItemsForMatching.length === 0) {
        setTopMatchedReasoning(`No other items currently available to suggest matches for your "${userFirstAvailableItem.name}".`);
        setLoadingTopMatches(false);
        return;
      }

      try {
        const result: ItemMatchOutput = await suggestMatchingItems({
          triggeringUserId: currentUser.id, // Pass the current user's ID
          currentItem: {
            id: userFirstAvailableItem.id,
            name: userFirstAvailableItem.name,
            description: userFirstAvailableItem.description,
            category: userFirstAvailableItem.category,
          },
          availableItems: otherAvailableItemsForMatching,
        });

        const matchedItemsFromDummy = dummyItems.filter(item => result.suggestedItemIds.includes(item.id));
        setTopMatchedItems(matchedItemsFromDummy);

        const reasoningIsErrorOrSystemMessage = result.reasoning && (
            result.reasoning.toLowerCase().includes('error') || 
            result.reasoning.toLowerCase().includes('overloaded') ||
            result.reasoning.toLowerCase().includes('could not process') ||
            result.reasoning.toLowerCase().includes('usage limit') ||
            result.reasoning.toLowerCase().includes('no other items available') || // from flow itself
            result.reasoning.toLowerCase().includes('ai assistant could not generate suggestions') // from flow itself
        );

        setTopMatchedReasoning(result.reasoning || (matchedItemsFromDummy.length === 0 ? `We couldn't find specific AI matches for your "${userFirstAvailableItem.name}" right now.` : null));
        
        // Do not show toast here as it's page load, reasoning is shown in card.

      } catch (error) {
        console.error("Error fetching top matches (client-side catch):", error);
        setTopMatchedReasoning(`Could not load matches for your "${userFirstAvailableItem.name}" due to a system issue.`);
      } finally {
        setLoadingTopMatches(false);
      }
    }

    fetchTopMatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch on initial load


  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-headline text-primary mb-4">Welcome to BarterVerse</h1>
        <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
          Discover unique items and connect with fellow traders. Your next great find is just a barter away!
        </p>
      </section>

      {loadingTopMatches && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                {userFirstItemNameForTitle ? `Finding Matches for your ${userFirstItemNameForTitle}...` : "Looking for Match Suggestions..."}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="flex flex-col overflow-hidden h-full bg-muted/50">
                    <div className="aspect-[4/3] bg-muted animate-pulse"></div>
                    <CardContent className="p-4 flex-grow space-y-2">
                      <div className="h-5 bg-muted-foreground/20 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-full"></div>
                      <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-1/2"></div>
                    </CardContent>
                    <CardFooter className="p-4 border-t border-muted-foreground/10">
                      <div className="h-9 bg-muted-foreground/20 rounded animate-pulse w-full"></div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          <Separator className="my-8" />
        </section>
      )}

      {!loadingTopMatches && (topMatchedItems.length > 0 || topMatchedReasoning) && (
         <section>
          <Card className={topMatchedItems.length === 0 ? "border-border border-dashed" : "border-border"}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Sparkles className={`h-6 w-6 ${topMatchedItems.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                {topMatchedItems.length > 0 ? "Suggested For You" : "Trade Ideas"}
                {userFirstItemNameForTitle && topMatchedItems.length > 0 && (
                  <span className="text-base font-body text-muted-foreground ml-2">
                    (for your {userFirstItemNameForTitle})
                  </span>
                )}
              </CardTitle>
              {topMatchedReasoning && (
                <p className="text-sm text-muted-foreground mt-1 font-body">{topMatchedReasoning}</p>
              )}
            </CardHeader>
            <CardContent>
              {topMatchedItems.length > 0 ? (
                <ItemList items={topMatchedItems} />
              ) : (
                <p className="text-muted-foreground font-body">{topMatchedReasoning || "No suggestions available at the moment."}</p>
              )}
            </CardContent>
          </Card>
          <Separator className="my-8" />
        </section>
      )}

      <SearchBar 
        onSearch={(query) => console.log('Searching for:', query)} 
        onFilterToggle={() => console.log('Toggle filters')} 
      />
      
      <section>
        <h2 className="text-3xl font-headline text-foreground mb-6">Browse All Items</h2>
        <ItemList items={allAvailableOrPendingItems} />
      </section>
    </div>
  );
}
