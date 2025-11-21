"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
import { getAllItems, getItemsByOwner } from '@/lib/firebase/firestoreUtils'; // Removed getUser, getItem as appUser handles current user profile
import type { Item, User } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle, ListPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface UserItemSuggestion {
  userItem: Item;
  suggestedMatches: (Item & { matchScore: string; reciprocalItemId?: string })[];
  isLoading: boolean;
  error: string | null;
  preferencesConsidered: boolean;
  usedMatchingMode: 'simple' | 'advanced' | undefined;
}

export default function HomePage() {
  const { appUser, isLoading: authIsLoading, currentUser: firebaseUser } = useAuth();
  const [currentUserActiveListings, setCurrentUserActiveListings] = useState<Item[]>([]);
  const [otherUsersItems, setOtherUsersItems] = useState<Item[]>([]);
  const [userItemSuggestions, setUserItemSuggestions] = useState<UserItemSuggestion[]>([]);
  const [overallLoading, setOverallLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authIsLoading) {
      setOverallLoading(true);
      return;
    }

    async function loadPageData() {
      setOverallLoading(true);
      const currentAuthUserId = firebaseUser?.uid;

      try {
        if (appUser && currentAuthUserId) {
          const userItems = await getItemsByOwner(currentAuthUserId);
          setCurrentUserActiveListings(
            userItems.filter(item => (item.listingType === 'offer' || item.listingType === 'want') && (item.status === 'available' || item.status === 'pending'))
          );
        } else {
          setCurrentUserActiveListings([]);
        }

        const allItemsFromDB = await getAllItems();
        setOtherUsersItems(
          allItemsFromDB.filter(item => item.ownerId !== currentAuthUserId && (item.status === 'available' || item.status === 'pending'))
        );

      } catch (error) {
        console.error("Error loading initial page data:", error);
        toast({ title: "Error Loading Data", description: "Could not load necessary data from Firestore.", variant: "destructive" });
        setCurrentUserActiveListings([]);
        setOtherUsersItems([]);
      }
      // overallLoading is set to false after AI suggestions (if any) or if no user/listings
    }
    loadPageData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, firebaseUser, authIsLoading, toast]);

  useEffect(() => {
    if (authIsLoading) return;

    if (!appUser || currentUserActiveListings.length === 0) {
      if (!appUser && !authIsLoading) { // Not logged in
         setUserItemSuggestions([]); // Clear suggestions
      } else if (appUser && currentUserActiveListings.length === 0) { // Logged in but no active listings
        setUserItemSuggestions([{
            userItem: { id: 'no-active-listings', name: 'No Active Listings Found', description: "You haven't listed any items yet, or none are currently active.", imageUrl: '', category: '', ownerId: appUser.id, ownerName: appUser.name, status: 'available', listingType: 'offer' },
            suggestedMatches: [], isLoading: false, error: null, preferencesConsidered: false, usedMatchingMode: undefined,
        }]);
      }
      setOverallLoading(false);
      return;
    }

    // This effect runs if appUser is present, has active listings, and otherUsersItems might be ready
    // It also implies overallLoading was true from the previous effect if we reached here with listings.
    async function fetchAllUserItemMatches() {
        setOverallLoading(true); // Explicitly set loading for AI suggestions part

        const initialSuggestions = currentUserActiveListings.map(item => ({
            userItem: item, suggestedMatches: [], isLoading: true, error: null, preferencesConsidered: false, usedMatchingMode: undefined,
        }));
        setUserItemSuggestions(initialSuggestions);

        const suggestionPromises = currentUserActiveListings.map(async (userItem, index) => {
            const otherItemsForAIService = otherUsersItems
            .filter(item => item.id !== userItem.id)
            .map(item => ({
                id: item.id, name: item.name, description: item.description, category: item.category, ownerId: item.ownerId,
                listingType: item.listingType, isGiftItForward: item.isGiftItForward, openToAnyOpportunity: item.openToAnyOpportunity,
            }));

            if (otherItemsForAIService.length === 0) {
            return { index, success: true, data: { suggestedMatches: [], reasoning: `No other items currently available from other users to suggest matches for your "${userItem.name}".`, preferencesConsidered: false, usedMatchingMode: 'simple',} as Pick<ItemMatchOutput, 'suggestedMatches' | 'reasoning' | 'preferencesConsidered' | 'usedMatchingMode'>, };
            }

            try {
            const result: ItemMatchOutput = await suggestMatchingItems({
                triggeringUserId: appUser?.id || 'anonymous', // Use actual authenticated appUser ID
                currentItem: {
                  id: userItem.id, name: userItem.name, description: userItem.description, category: userItem.category,
                  ownerId: userItem.ownerId, listingType: userItem.listingType, isGiftItForward: userItem.isGiftItForward,
                  openToAnyOpportunity: userItem.openToAnyOpportunity,
                },
                availableItems: otherItemsForAIService,
            });
            return { index, success: true, data: result };
            } catch (error) {
            console.error(`Error fetching matches for ${userItem.name}:`, error);
            return { index, success: false, error: `Could not load matches for your "${userItem.name}" due to a system issue.`,};
            }
        });

        const results = await Promise.allSettled(suggestionPromises);
        const allItemsForLookup = await getAllItems(); // Re-fetch or use a broader cache if necessary

        setUserItemSuggestions(prevSuggestions => {
            const newSuggestions = [...prevSuggestions];
            results.forEach(settledResult => {
            if (settledResult.status === 'fulfilled') {
                const { index, success, data, error: promiseError } = settledResult.value;
                if (success && data) {
                const itemsWithScores = (data.suggestedMatches || []).map(match => {
                    const itemDetails = allItemsForLookup.find(dItem => dItem.id === match.itemId);
                    return itemDetails ? { ...itemDetails, matchScore: match.matchScore, isGiftItForward: match.isGiftItForward || itemDetails.isGiftItForward, reciprocalItemId: match.reciprocalItemId } : null;
                }).filter(Boolean) as (Item & { matchScore: string; reciprocalItemId?: string })[];
                newSuggestions[index] = { ...newSuggestions[index], suggestedMatches: itemsWithScores, isLoading: false, error: null, preferencesConsidered: data.preferencesConsidered || false, usedMatchingMode: data.usedMatchingMode, };
                } else {
                newSuggestions[index] = { ...newSuggestions[index], isLoading: false, error: promiseError || "Failed to process suggestions for this item.", };
                }
            }
            });
            return newSuggestions;
        });
        setOverallLoading(false);
      }

      if (appUser && currentUserActiveListings.length > 0) {
        fetchAllUserItemMatches();
      } else {
        // If no appUser or no listings, ensure loading is false if not already handled
        setOverallLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, currentUserActiveListings, otherUsersItems, authIsLoading]);


  return (
    <div className="space-y-8">
      {(overallLoading || authIsLoading) && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                {appUser ? "Loading Your Listings & AI Suggestions..." : "Loading page..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[...Array(appUser ? 1: 0)].map((_, i) => ( // Show one skeleton if user might have listings
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
               {(!appUser && !authIsLoading) && <p className="text-muted-foreground font-body text-center py-4">Loading items available for trade...</p>}
            </CardContent>
          </Card>
          <Separator className="my-8" />
        </section>
      )}

      {!overallLoading && !authIsLoading && (!appUser || (userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id === 'no-active-listings')) && (
        <section>
            <Card className="border-border border-dashed">
                 <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                        Trade Ideas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground font-body text-center py-4">
                      {appUser
                        ? "List an item (offer or want) to see personalized AI matches and potential trades here!"
                        : <span><Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> and list an item to see personalized AI matches!</span>}
                    </p>
                </CardContent>
            </Card>
            <Separator className="my-8" />
        </section>
      )}

      {!overallLoading && !authIsLoading && appUser && userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id !== 'no-active-listings' && (
        userItemSuggestions.map((itemSuggestion, idx) => {
          const showQuickListPrompt = !itemSuggestion.isLoading && !itemSuggestion.error && itemSuggestion.suggestedMatches.length <= 1;
          return (
            <section key={itemSuggestion.userItem.id || idx}>
              <Card className={itemSuggestion.error ? "border-destructive" : (itemSuggestion.suggestedMatches.length === 0 && !itemSuggestion.isLoading ? "border-border border-dashed" : "border-border")}>
                <CardHeader>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                      <CardTitle className={`font-headline text-xl flex items-center gap-2 ${itemSuggestion.error ? 'text-destructive' : ''}`}>
                      {itemSuggestion.isLoading ? <Loader2 className="h-6 w-6 text-primary animate-spin" /> : (itemSuggestion.error ? <AlertCircle className="h-6 w-6 text-destructive" /> : <Sparkles className={`h-6 w-6 ${itemSuggestion.suggestedMatches.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />)}
                      
                      {itemSuggestion.isLoading ? (
                        `Finding Matches for your ${itemSuggestion.userItem.listingType === 'offer' ? 'Offer' : 'Want'}: "${itemSuggestion.userItem.name}"...`
                      ) : itemSuggestion.error ? (
                        `Error for ${itemSuggestion.userItem.listingType === 'offer' ? 'Offer' : 'Want'}: "${itemSuggestion.userItem.name}"`
                      ) : (
                        <>
                          {itemSuggestion.userItem.listingType === 'offer' ? 'Matches your Offer' : 'Matches your Want'}:{" "}
                          <Link href={`/items/${itemSuggestion.userItem.id}`} className="text-primary hover:underline">
                            &quot;{itemSuggestion.userItem.name}&quot;
                          </Link>
                        </>
                      )}
                      </CardTitle>
                  </div>
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
                    <p className="text-muted-foreground font-body text-center py-4">
                      {itemSuggestion.suggestedMatches.length === 0 ? `We couldn't find specific matches for your "${itemSuggestion.userItem.name}" right now.` : "No matches found."}
                    </p>
                  )}
                  {showQuickListPrompt && (
                    <div className="mt-4 p-3 bg-accent/10 rounded-md border border-accent/30 border-dashed text-center">
                      <p className="text-sm font-body text-accent-foreground/90">
                        Looking for more trade opportunities? List more items! <br />
                        Try our{' '}
                        <Button variant="link" asChild className="p-0 h-auto text-accent inline-flex items-center gap-1 text-sm">
                          <Link href="/quick-list">
                            <ListPlus className="h-4 w-4" /> Quick List feature
                          </Link>
                        </Button>
                        {' '}to add multiple items easily.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              {idx < userItemSuggestions.length -1 && <Separator className="my-8" />}
            </section>
          );
        })
      )}

      <SearchBar
        onSearch={(query) => console.log('Searching for:', query)}
        onFilterToggle={() => console.log('Toggle filters')}
      />

      <section>
        <h2 className="text-3xl font-headline text-foreground mb-6">Browse All Items from Other Users</h2>
        {/* Ensure ItemList doesn't break if otherUsersItems is empty during initial load before auth resolves */}
        {(authIsLoading && otherUsersItems.length === 0) ? <p className="text-muted-foreground">Loading items...</p> : <ItemList items={otherUsersItems} /> }
      </section>
    </div>
  );
}
