
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
  const [topMatchedItemsWithScores, setTopMatchedItemsWithScores] = useState<(Item & { matchScore: string })[]>([]);
  const [topMatchedReasoning, setTopMatchedReasoning] = useState<string | null>(null);
  const [loadingTopMatches, setLoadingTopMatches] = useState(true);
  const [userFirstItemNameForTitle, setUserFirstItemNameForTitle] = useState<string | null>(null);

  const allAvailableOrPendingItems = dummyItems.filter(item => item.status === 'available' || item.status === 'pending');

  useEffect(() => {
    async function fetchTopMatches() {
      setLoadingTopMatches(true);
      setTopMatchedItemsWithScores([]);
      setTopMatchedReasoning(null);
      setUserFirstItemNameForTitle(null);

      const currentUser = dummyUsers[0]; // Simulate current user
      const userFirstAvailableItem = dummyItems.find(
        (item) => item.ownerId === currentUser.id && (item.status === 'available' || item.status === 'pending') && item.listingType === 'offer'
      );

      if (!userFirstAvailableItem) {
        setTopMatchedReasoning("List an 'offer' item to see personalized matches here!");
        setLoadingTopMatches(false);
        return;
      }
      setUserFirstItemNameForTitle(userFirstAvailableItem.name);

      const otherAvailableItemsForMatching = dummyItems.filter(
        (item) => item.id !== userFirstAvailableItem.id && (item.status === 'available' || item.status === 'pending') && item.listingType === 'offer'
      ).map(item => ({ 
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        ownerId: item.ownerId, // Ensure ownerId is passed
      }));

      if (otherAvailableItemsForMatching.length === 0) {
        setTopMatchedReasoning(`No other 'offer' items currently available to suggest matches for your "${userFirstAvailableItem.name}".`);
        setLoadingTopMatches(false);
        return;
      }

      try {
        const result: ItemMatchOutput = await suggestMatchingItems({
          triggeringUserId: currentUser.id,
          currentItem: {
            id: userFirstAvailableItem.id,
            name: userFirstAvailableItem.name,
            description: userFirstAvailableItem.description,
            category: userFirstAvailableItem.category,
            ownerId: userFirstAvailableItem.ownerId, // Ensure ownerId is passed
          },
          availableItems: otherAvailableItemsForMatching,
        });

        const matchedItems = result.suggestedMatches.map(match => {
          const item = dummyItems.find(dItem => dItem.id === match.itemId);
          return item ? { ...item, matchScore: match.matchScore } : null;
        }).filter(Boolean) as (Item & { matchScore: string })[];
        
        setTopMatchedItemsWithScores(matchedItems);
        setTopMatchedReasoning(result.reasoning || (matchedItems.length === 0 ? `We couldn't find specific AI matches for your "${userFirstAvailableItem.name}" right now.` : null));
        
      } catch (error) {
        console.error("Error fetching top matches (client-side catch):", error);
        setTopMatchedReasoning(`Could not load matches for your "${userFirstAvailableItem.name}" due to a system issue.`);
      } finally {
        setLoadingTopMatches(false);
      }
    }

    fetchTopMatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


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

      {!loadingTopMatches && (topMatchedItemsWithScores.length > 0 || topMatchedReasoning) && (
         <section>
          <Card className={topMatchedItemsWithScores.length === 0 ? "border-border border-dashed" : "border-border"}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Sparkles className={`h-6 w-6 ${topMatchedItemsWithScores.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                {topMatchedItemsWithScores.length > 0 ? "Suggested For You" : "Trade Ideas"}
                {userFirstItemNameForTitle && topMatchedItemsWithScores.length > 0 && (
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
              {topMatchedItemsWithScores.length > 0 ? (
                <ItemList items={topMatchedItemsWithScores} />
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
