
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // Added Link
import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
// import { dummyItems, dummyUsers } from '@/lib/dummy-data'; // Replaced with Firestore
import { getAllItems, getUser, getItemsByOwner, getItem } from '@/lib/firebase/firestoreUtils'; // Firestore access
import type { Item, User } from '@/types';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle, ListPlus } from 'lucide-react'; // Added ListPlus
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added Button for Quick List link

// Simulated current user ID - replace with actual auth logic when available
const SIMULATED_CURRENT_USER_ID = 'user1';

interface UserItemSuggestion {
  userItem: Item;
  suggestedMatches: (Item & { matchScore: string; reciprocalItemId?: string })[];
  isLoading: boolean;
  error: string | null;
  preferencesConsidered: boolean;
  usedMatchingMode: 'simple' | 'advanced' | undefined;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserActiveListings, setCurrentUserActiveListings] = useState<Item[]>([]);
  const [otherUsersItems, setOtherUsersItems] = useState<Item[]>([]);

  const [userItemSuggestions, setUserItemSuggestions] = useState<UserItemSuggestion[]>([]);
  const [overallLoading, setOverallLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial data: current user, their items, and other users' items
  useEffect(() => {
    async function loadInitialData() {
      setOverallLoading(true);
      try {
        const user = await getUser(SIMULATED_CURRENT_USER_ID);
        setCurrentUser(user);

        if (user) {
          const userItems = await getItemsByOwner(user.id);
          setCurrentUserActiveListings(
            userItems.filter(item => (item.listingType === 'offer' || item.listingType === 'want') && (item.status === 'available' || item.status === 'pending'))
          );
        } else {
          setCurrentUserActiveListings([]);
          toast({ title: "Error", description: `Simulated current user (ID: ${SIMULATED_CURRENT_USER_ID}) not found in Firestore.`, variant: "destructive" });
        }

        const allItemsFromDB = await getAllItems();
        setOtherUsersItems(
          allItemsFromDB.filter(item => item.ownerId !== SIMULATED_CURRENT_USER_ID && (item.status === 'available' || item.status === 'pending'))
        );

      } catch (error) {
        console.error("Error loading initial page data:", error);
        toast({ title: "Error Loading Data", description: "Could not load necessary data from Firestore.", variant: "destructive" });
        // Set empty states or specific error states if needed
        setCurrentUserActiveListings([]);
        setOtherUsersItems([]);
      }
      // Overall loading will be set to false after AI suggestions are processed or if no listings
    }
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Effect to process AI suggestions once current user's listings and other items are loaded
  useEffect(() => {
    if (!currentUser || currentUserActiveListings.length === 0 && !overallLoading && currentUser) { // If loading is done and no listings
        if (currentUserActiveListings.length === 0 && currentUser) { // Check currentUser to ensure initial load attempt happened
             setUserItemSuggestions([{
                userItem: { id: 'no-active-listings', name: 'No Active Listings Found', description: "You haven't listed any items yet, or none are currently active.", imageUrl: '', category: '', ownerId: '', ownerName: '', status: 'available', listingType: 'offer' },
                suggestedMatches: [],
                isLoading: false,
                error: null,
                preferencesConsidered: false,
                usedMatchingMode: undefined,
            }]);
        }
        setOverallLoading(false); // Ensure loading is false if no listings or no current user
        return;
    }

    if (currentUser && currentUserActiveListings.length > 0 && otherUsersItems.length >= 0 && overallLoading) { // overallLoading check to run only once after initial data
        // This check ^ ensures we only proceed if we have the user, their listings, and other items (even if empty)
        // and overallLoading is true (meaning we haven't processed suggestions yet)

      async function fetchAllUserItemMatches() {
        // No need to setOverallLoading(true) here as it's already true or managed by initial load.
        // setUserItemSuggestions([]); // Cleared by initial state or if no listings

        if (currentUserActiveListings.length === 0) { // Should be caught by above, but safeguard
            setUserItemSuggestions([{
            userItem: { id: 'no-active-listings', name: 'No Active Listings Found', description: "You haven't listed any items yet, or none are currently active.", imageUrl: '', category: '', ownerId: '', ownerName: '', status: 'available', listingType: 'offer' },
            suggestedMatches: [],
            isLoading: false,
            error: null,
            preferencesConsidered: false,
            usedMatchingMode: undefined,
            }]);
            setOverallLoading(false);
            return;
        }

        const initialSuggestions = currentUserActiveListings.map(item => ({
            userItem: item,
            suggestedMatches: [],
            isLoading: true,
            error: null,
            preferencesConsidered: false,
            usedMatchingMode: undefined,
        }));
        setUserItemSuggestions(initialSuggestions);

        const suggestionPromises = currentUserActiveListings.map(async (userItem, index) => {
            const otherItemsForAIService = otherUsersItems // Already filtered by owner and status
            .filter(item => item.id !== userItem.id) // Ensure not matching with itself, though AI service might also handle
            .map(item => ({ // Map to the structure expected by the AI service
                id: item.id,
                name: item.name,
                description: item.description,
                category: item.category,
                ownerId: item.ownerId,
                listingType: item.listingType,
                isGiftItForward: item.isGiftItForward,
                openToAnyOpportunity: item.openToAnyOpportunity,
            }));

            if (otherItemsForAIService.length === 0) {
            return {
                index,
                success: true,
                data: {
                suggestedMatches: [],
                reasoning: `No other items currently available from other users to suggest matches for your "${userItem.name}".`,
                preferencesConsidered: false,
                usedMatchingMode: 'simple',
                } as Pick<ItemMatchOutput, 'suggestedMatches' | 'reasoning' | 'preferencesConsidered' | 'usedMatchingMode'>,
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
                isGiftItForward: userItem.isGiftItForward,
                openToAnyOpportunity: userItem.openToAnyOpportunity,
                },
                availableItems: otherItemsForAIService,
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

        // Need all items from DB to map IDs to full item details for suggested matches
        const allItemsForLookup = await getAllItems();

        setUserItemSuggestions(prevSuggestions => {
            const newSuggestions = [...prevSuggestions];
            results.forEach(settledResult => {
            if (settledResult.status === 'fulfilled') {
                const { index, success, data, error: promiseError } = settledResult.value;
                if (success && data) {
                const itemsWithScores = (data.suggestedMatches || []).map(match => {
                    // const itemDetails = otherUsersItems.find(dItem => dItem.id === match.itemId); // More efficient to use allItemsForLookup
                    const itemDetails = allItemsForLookup.find(dItem => dItem.id === match.itemId);
                    return itemDetails ? {
                    ...itemDetails,
                    matchScore: match.matchScore,
                    isGiftItForward: match.isGiftItForward || itemDetails.isGiftItForward,
                    reciprocalItemId: match.reciprocalItemId
                    } : null;
                }).filter(Boolean) as (Item & { matchScore: string; reciprocalItemId?: string })[];

                newSuggestions[index] = {
                    ...newSuggestions[index],
                    suggestedMatches: itemsWithScores,
                    isLoading: false,
                    error: null,
                    preferencesConsidered: data.preferencesConsidered || false,
                    usedMatchingMode: data.usedMatchingMode,
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
        setOverallLoading(false);
      }
      fetchAllUserItemMatches();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentUserActiveListings, otherUsersItems]); // Removed overallLoading from deps to prevent re-triggering


  return (
    <div className="space-y-8">
      

      {overallLoading && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                Loading Your Listings & AI Suggestions...
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

      {!overallLoading && userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id === 'no-active-listings' && (
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
                        List an item (offer or want) to see personalized AI matches and potential trades here!
                    </p>
                </CardContent>
            </Card>
            <Separator className="my-8" />
        </section>
      )}

      {!overallLoading && userItemSuggestions.length > 0 && userItemSuggestions[0].userItem.id !== 'no-active-listings' && (
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
        <ItemList items={otherUsersItems} />
      </section>
    </div>
  );
}
