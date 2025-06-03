
'use client';

import { useState, useEffect } from 'react';
import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput, type UserProfilePreferences } from '@/ai/flows/item-match-flow';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface UserItemSuggestion {
  userItem: Item;
  suggestedMatches: (Item & { matchScore: string })[];
  reasoning: string | null;
  isLoading: boolean;
  error: string | null;
  preferencesConsidered?: boolean;
}

export default function HomePage() {
  const [userItemSuggestions, setUserItemSuggestions] = useState<UserItemSuggestion[]>([]);
  const [overallLoading, setOverallLoading] = useState(true);
  const { toast } = useToast();

  const allAvailableOrPendingItemsFromOtherUsers = dummyItems.filter(item => 
    (item.status === 'available' || item.status === 'pending') && item.ownerId !== dummyUsers[0].id // Simulate current user is dummyUsers[0]
  );


  useEffect(() => {
    async function fetchAllUserItemMatches() {
      setOverallLoading(true);
      setUserItemSuggestions([]);

      const currentUser = dummyUsers[0]; // Simulate current user
      const userOfferItems = dummyItems.filter(
        (item) => item.ownerId === currentUser.id && item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending')
      );

      if (userOfferItems.length === 0) {
        setUserItemSuggestions([{
          userItem: { id: 'no-offers', name: 'No Offers Found', description: "You haven't listed any 'offer' items yet.", imageUrl: '', category: '', ownerId: '', ownerName: '', status: 'available', listingType: 'offer' },
          suggestedMatches: [],
          reasoning: "List an 'offer' item to see personalized AI matches and potential trades here!",
          isLoading: false,
          error: null,
        }]);
        setOverallLoading(false);
        return;
      }

      const initialSuggestions = userOfferItems.map(item => ({
        userItem: item,
        suggestedMatches: [],
        reasoning: null,
        isLoading: true,
        error: null,
        preferencesConsidered: false,
      }));
      setUserItemSuggestions(initialSuggestions);
      setOverallLoading(false); 

      const currentUserPreferences: UserProfilePreferences = {
        motivations: currentUser.motivations,
        locationPreference: currentUser.locationPreference,
        tradeTimingPreference: currentUser.tradeTimingPreference,
        interestedInThirdPartyFulfillment: currentUser.interestedInThirdPartyFulfillment,
      };

      const suggestionPromises = userOfferItems.map(async (userItem, index) => {
        const otherItemsForMatching = dummyItems.filter(
          (item) => item.id !== userItem.id && item.ownerId !== currentUser.id && (item.status === 'available' || item.status === 'pending')
        ).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          ownerId: item.ownerId,
          listingType: item.listingType,
        }));

        if (otherItemsForMatching.length === 0) {
          return {
            index,
            success: true,
            data: {
              suggestedMatches: [],
              reasoning: `No other items currently available from other users to suggest matches for your "${userItem.name}".`,
              preferencesConsidered: false, 
            },
          };
        }
        
        try {
          const result: ItemMatchOutput = await suggestMatchingItems({
            triggeringUserId: currentUser.id,
            currentItem: {
              id: userItem.id,
              name: userItem.name,
              description: userItem.description,
              category: userItem.category,
              ownerId: userItem.ownerId,
              listingType: userItem.listingType,
            },
            availableItems: otherItemsForMatching,
            triggeringUserPreferences: currentUserPreferences,
          });
          return { index, success: true, data: result };
        } catch (error) {
          console.error(`Error fetching matches for ${userItem.name}:`, error);
          return {
            index,
            success: false,
            error: `Could not load matches for your "${userItem.name}" due to a system issue.`,
          };
        }
      });

      const results = await Promise.allSettled(suggestionPromises);

      setUserItemSuggestions(prevSuggestions => {
        const newSuggestions = [...prevSuggestions];
        results.forEach(settledResult => {
          if (settledResult.status === 'fulfilled') {
            const { index, success, data, error: promiseError } = settledResult.value;
            if (success && data) {
              const matchedItems = (data.suggestedMatches || []).map(match => {
                const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
                return itemDetails ? { ...itemDetails, matchScore: match.matchScore } : null;
              }).filter(Boolean) as (Item & { matchScore: string })[];
              
              newSuggestions[index] = {
                ...newSuggestions[index],
                suggestedMatches: matchedItems,
                reasoning: data.reasoning || (matchedItems.length === 0 ? `We couldn't find specific AI matches for your "${newSuggestions[index].userItem.name}" right now.` : null),
                isLoading: false,
                error: null,
                preferencesConsidered: data.preferencesConsidered,
              };
            } else {
              newSuggestions[index] = {
                ...newSuggestions[index],
                isLoading: false,
                error: promiseError || "Failed to process suggestions for this item.",
              };
            }
          } 
        });
        return newSuggestions;
      });
    }

    fetchAllUserItemMatches();
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

      {overallLoading && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                Loading Your Items & AI Suggestions...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[...Array(1)].map((_, i) => ( 
                <div key={i} className="p-4 border rounded-md bg-muted/30">
                  <div className="h-6 bg-muted-foreground/20 rounded animate-pulse w-1/2 mb-4"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, j) => (
                      <Card key={j} className="flex flex-col overflow-hidden h-full bg-muted/50">
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
                </div>
              ))}
            </CardContent>
          </Card>
          <Separator className="my-8" />
        </section>
      )}

      {!overallLoading && userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id === 'no-offers' && (
        <section>
            <Card className="border-border border-dashed">
                 <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                        AI Trade Ideas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground font-body text-center py-4">{userItemSuggestions[0].reasoning}</p>
                </CardContent>
            </Card>
            <Separator className="my-8" />
        </section>
      )}

      {!overallLoading && userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id !== 'no-offers' && (
        userItemSuggestions.map((itemSuggestion, idx) => (
          <section key={itemSuggestion.userItem.id || idx}>
            <Card className={itemSuggestion.error ? "border-destructive" : (itemSuggestion.suggestedMatches.length === 0 && !itemSuggestion.isLoading ? "border-border border-dashed" : "border-border")}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className={`font-headline text-2xl flex items-center gap-2 ${itemSuggestion.error ? 'text-destructive' : ''}`}>
                    {itemSuggestion.isLoading ? <Loader2 className="h-6 w-6 text-primary animate-spin" /> : (itemSuggestion.error ? <AlertCircle className="h-6 w-6 text-destructive" /> : <Sparkles className={`h-6 w-6 ${itemSuggestion.suggestedMatches.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />)}
                    {itemSuggestion.isLoading ? `Finding Matches for your ${itemSuggestion.userItem.name}...` : 
                    itemSuggestion.error ? `Error for ${itemSuggestion.userItem.name}` : 
                    `AI Matches for your ${itemSuggestion.userItem.name}`}
                    </CardTitle>
                    {!itemSuggestion.isLoading && !itemSuggestion.error && itemSuggestion.preferencesConsidered && (
                        <Badge variant="outline" className="text-xs ml-2">Preferences Used</Badge>
                    )}
                </div>
                {!itemSuggestion.isLoading && itemSuggestion.reasoning && !itemSuggestion.error && itemSuggestion.suggestedMatches.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 font-body">{itemSuggestion.reasoning}</p>
                )}
                 {!itemSuggestion.isLoading && itemSuggestion.error && (
                  <p className="text-sm text-destructive mt-1 font-body">{itemSuggestion.error}</p>
                )}
              </CardHeader>
              <CardContent>
                {itemSuggestion.isLoading ? (
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
                ) : !itemSuggestion.error && itemSuggestion.suggestedMatches.length > 0 ? (
                  <ItemList items={itemSuggestion.suggestedMatches} mainContextItemId={itemSuggestion.userItem.id} />
                ) : !itemSuggestion.error && (
                  <p className="text-muted-foreground font-body text-center py-4">{itemSuggestion.reasoning || "No specific AI suggestions found for this item at the moment."}</p>
                )}
              </CardContent>
            </Card>
            {idx < userItemSuggestions.length -1 && <Separator className="my-8" />}
          </section>
        ))
      )}
      
      <SearchBar
        onSearch={(query) => console.log('Searching for:', query)}
        onFilterToggle={() => console.log('Toggle filters')}
      />

      <section>
        <h2 className="text-3xl font-headline text-foreground mb-6">Browse All Items from Other Users</h2>
        <ItemList items={allAvailableOrPendingItemsFromOtherUsers} />
      </section>
    </div>
  );
}
