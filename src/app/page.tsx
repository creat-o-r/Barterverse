
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // Added Link
import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
import type { Item, User as AppUserType } from '@/types'; // User for currentUser type hint
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { getAllItems as getAllItemsFromDb, getItemsByUserId, searchItems } from '@/services/itemService'; // Import itemService and searchItems
import { useGlobalFilter } from '@/contexts/GlobalFilterContext'; // Import GlobalFilterContext
import { Sparkles, Loader2, AlertCircle, ListPlus } from 'lucide-react'; // Added ListPlus
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added Button for Quick List link

interface UserItemSuggestion {
  userItem: Item;
  suggestedMatches: (Item & { matchScore: string; reciprocalItemId?: string })[];
  isLoading: boolean;
  error: string | null;
  preferencesConsidered: boolean;
  usedMatchingMode: 'simple' | 'advanced' | undefined;
}

export default function HomePage() {
  const [userItemSuggestions, setUserItemSuggestions] = useState<UserItemSuggestion[]>([]);
  const [allBrowseItems, setAllBrowseItems] = useState<Item[]>([]);
  const [searchResults, setSearchResults] = useState<Item[] | null>(null); // null: no search, []: search done, no results
  const [overallLoading, setOverallLoading] = useState(true);
  const [browseItemsLoading, setBrowseItemsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser: authCurrentUser, loading: authLoading } = useAuth();
  const { selectedCategory: globalSelectedCategory } = useGlobalFilter();

  // New state for storing all items fetched once
  const [allExistingItemsFromDb, setAllExistingItemsFromDb] = useState<Item[]>([]);
  const [allExistingItemsLoading, setAllExistingItemsLoading] = useState(true);

  // Effect to fetch all items once
  useEffect(() => {
    async function fetchAllDatabaseItemsOnce() {
      console.log('[HomePage] Fetching all items from database ONCE...');
      setAllExistingItemsLoading(true);
      try {
        const items = await getAllItemsFromDb();
        setAllExistingItemsFromDb(items);
        console.log(`[HomePage] Fetched ${items.length} total items ONCE from database.`);
      } catch (error: any) {
        console.error("[HomePage] Error fetching all items from database ONCE:", error.message, error.stack);
        toast({ title: "Error", description: "Could not load all item data.", variant: "destructive" });
        setAllExistingItemsFromDb([]);
      } finally {
        setAllExistingItemsLoading(false);
      }
    }
    fetchAllDatabaseItemsOnce();
  }, [toast]); // Runs once on mount, toast is a stable dependency

  // Effect to set up initial browse items from allExistingItemsFromDb
  useEffect(() => {
    if (allExistingItemsLoading || searchResults !== null) {
      // Wait for all items to be loaded or if a search is active, don't override browse items
      if(searchResults !== null) console.log('[HomePage] Skipping initial browse items setup due to active search results.');
      else console.log('[HomePage] Waiting for allExistingItemsFromDb to load before setting up browse items.');
      return;
    }

    console.log('[HomePage] Setting up initial browse items from allExistingItemsFromDb...');
    setBrowseItemsLoading(true); // Still use this for the browse section's own loading perception
    try {
      const filteredItems = authCurrentUser
        ? allExistingItemsFromDb.filter(item => item.ownerId !== authCurrentUser.uid && (item.status === 'available' || item.status === 'pending'))
        : allExistingItemsFromDb.filter(item => item.status === 'available' || item.status === 'pending');
      setAllBrowseItems(filteredItems);
      console.log(`[HomePage] Setup ${filteredItems.length} initial browse items from allExistingItemsFromDb.`);
    } catch (error: any) {
      console.error("[HomePage] Error filtering initial browse items:", error.message, error.stack);
      toast({ title: "Error", description: "Could not prepare items for browsing.", variant: "destructive" });
      setAllBrowseItems([]);
    } finally {
      setBrowseItemsLoading(false);
    }
  }, [authCurrentUser, toast, searchResults, allExistingItemsFromDb, allExistingItemsLoading]);


  const handleExecuteSearch = async (searchText: string) => {
    console.log(`[HomePage] Executing search for: "${searchText}", category: "${globalSelectedCategory || 'any'}"`);
    if (!searchText.trim()) {
      console.log('[HomePage] Search text empty, clearing search results.');
      setSearchResults(null);
      return;
    }

    setBrowseItemsLoading(true);
    setSearchResults([]);
    try {
      const results = await searchItems(searchText, globalSelectedCategory || undefined);
      const filteredResults = authCurrentUser
        ? results.filter(item => item.ownerId !== authCurrentUser.uid)
        : results;
      setSearchResults(filteredResults);
      console.log(`[HomePage] Search found ${filteredResults.length} items.`);
      if (filteredResults.length === 0) {
        toast({ title: "No Results", description: `No items found matching "${searchText}" ${globalSelectedCategory ? `in ${globalSelectedCategory}` : ''}.` });
      }
    } catch (error: any) {
      console.error("[HomePage] Error during search:", error.message, error.stack);
      toast({ title: "Search Error", description: "Could not perform search.", variant: "destructive" });
      setSearchResults([]);
    } finally {
      setBrowseItemsLoading(false);
    }
  };


  // Fetch user's items and AI suggestions
  useEffect(() => {
    async function fetchUserSpecificDataAndSuggestions() {
      if (authLoading || allExistingItemsLoading) { // Also wait for allExistingItems to load
        console.log(`[HomePage] Deferring user-specific data/suggestions. Auth Loading: ${authLoading}, All Items Loading: ${allExistingItemsLoading}`);
        return;
      }
      console.log('[HomePage] Attempting to fetch user-specific data and AI suggestions using pre-fetched allExistingItemsFromDb.');
      setOverallLoading(true);
      setUserItemSuggestions([]);

      if (!authCurrentUser) {
        console.log('[HomePage] No authenticated user. Setting suggestions to "not-logged-in" state.');
         setUserItemSuggestions([{
          userItem: { id: 'not-logged-in', name: 'Sign in to see personalized matches!', description: "Log in or sign up to get AI-powered trade suggestions for your items.", imageUrl: '', category: '', ownerId: '', ownerName: '', status: 'available', listingType: 'offer' },
          suggestedMatches: [],
          isLoading: false,
          error: null,
          preferencesConsidered: false,
          usedMatchingMode: undefined,
        }]);
        setOverallLoading(false);
        return;
      }
      console.log(`[HomePage] User ${authCurrentUser.uid} authenticated. Fetching active listings.`);
      try {
        // currentUserActiveListings still needs to be fetched per user
        const currentUserActiveListings = (await getItemsByUserId(authCurrentUser.uid)).filter(
          (item) => (item.listingType === 'offer' || item.listingType === 'want') && (item.status === 'available' || item.status === 'pending')
        );
        console.log(`[HomePage] Found ${currentUserActiveListings.length} active listings for user ${authCurrentUser.uid}.`);

        // Use the already fetched allExistingItemsFromDb for the matching pool
        const allItemsFromDatabase = allExistingItemsFromDb;
        console.log(`[HomePage] Using ${allItemsFromDatabase.length} pre-fetched total items for matching pool.`);

        if (currentUserActiveListings.length === 0) {
          console.log(`[HomePage] No active listings for user ${authCurrentUser.uid}. Setting suggestions to "no-active-listings" state.`);
          setUserItemSuggestions([{
            userItem: { id: 'no-active-listings', name: 'No Active Listings Found', description: "You haven't listed any items yet, or none are currently active for matching.", imageUrl: '', category: '', ownerId: authCurrentUser.uid, ownerName: '', status: 'available', listingType: 'offer' },
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
        console.log(`[HomePage] Initialized ${initialSuggestions.length} suggestion slots.`);

        const suggestionPromises = currentUserActiveListings.map(async (userItem, index) => {
          console.log(`[HomePage] Preparing AI match suggestion for user item: ${userItem.id} (${userItem.name})`);
          const otherItemsForMatching = allItemsFromDatabase.filter(
            (item) => item.id !== userItem.id && item.ownerId !== authCurrentUser.uid && (item.status === 'available' || item.status === 'pending')
          ).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            ownerId: item.ownerId,
            listingType: item.listingType,
            isGiftItForward: item.isGiftItForward || false,
            openToAnyOpportunity: item.openToAnyOpportunity || false,
          }));
          console.log(`[HomePage] Found ${otherItemsForMatching.length} other items for matching against ${userItem.id}.`);

          if (otherItemsForMatching.length === 0) {
            console.log(`[HomePage] No other items for matching for ${userItem.id}. Returning empty suggestions.`);
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
          console.log(`[HomePage] Calling suggestMatchingItems AI flow for user item: ${userItem.id}`);
          const result: ItemMatchOutput = await suggestMatchingItems({
            triggeringUserId: authCurrentUser.uid, // Use authCurrentUser.uid
            currentItem: {
              id: userItem.id,
              name: userItem.name,
              description: userItem.description,
              category: userItem.category,
              ownerId: userItem.ownerId, // This is authCurrentUser.uid
              listingType: userItem.listingType,
              isGiftItForward: userItem.isGiftItForward || false,
              openToAnyOpportunity: userItem.openToAnyOpportunity || false,
            },
            availableItems: otherItemsForMatching,
          });
          console.log(`[HomePage] AI flow returned for ${userItem.id}. Matches: ${result.suggestedMatches?.length || 0}. Reasoning: ${result.reasoning}`);
          return { index, success: true, data: result };
        } catch (error: any) {
          console.error(`[HomePage] Error fetching matches for ${userItem.name} (ID: ${userItem.id}):`, error.message, error.stack);
          return {
            index,
            success: false,
            error: `Could not load matches for your "${userItem.name}" due to a system issue.`,
          };
        }
      });

      const results = await Promise.allSettled(suggestionPromises);
      console.log('[HomePage] All AI suggestion promises settled.');

      setUserItemSuggestions(prevSuggestions => {
        const newSuggestions = [...prevSuggestions];
        results.forEach(settledResult => {
          if (settledResult.status === 'fulfilled') {
            const { index, success, data, error: promiseError } = settledResult.value;
            if (success && data) {
              // `allItemsFromDatabase` should be available in this scope from the parent useEffect
              // If not, it needs to be passed or fetched again, but ideally fetched once.
              // For now, assuming it's available or passed down if this effect is refactored.
              // Let's assume `allItemsFromDatabase` is accessible here.
              // If `fetchAllUserItemMatches` is kept separate, `allItemsFromDatabase` must be passed to it.
              // For this refactor, I included its fetching inside `fetchUserSpecificDataAndSuggestions`.
              const itemsWithScores = (data.suggestedMatches || []).map(match => {
                const itemDetails = allItemsFromDatabase.find(dItem => dItem.id === match.itemId);
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

    fetchUserSpecificDataAndSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCurrentUser, authLoading, allExistingItemsFromDb, allExistingItemsLoading]); // Correctly closes useEffect

  return ( // This is the main return for HomePage
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
        executeSearch={handleExecuteSearch} // Pass the handler
        onFilterToggle={() => console.log('Toggle filters')} // Keep filter toggle if needed later
      />

      <section>
        <h2 className="text-3xl font-headline text-foreground mb-6">
          {searchResults !== null ? 'Search Results' : 'Browse All Items from Other Users'}
        </h2>
        {browseItemsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => ( // Skeleton loader
              <Card key={i} className="flex flex-col overflow-hidden h-full bg-muted/50 animate-pulse">
                <div className="aspect-[4/3] bg-muted"></div>
                <CardContent className="p-4 flex-grow space-y-2">
                  <div className="h-5 bg-muted-foreground/20 rounded w-3/4"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
                </CardContent>
                <CardFooter className="p-4 border-t border-muted-foreground/10">
                  <div className="h-9 bg-muted-foreground/20 rounded w-full"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : searchResults !== null ? ( // Display search results
          searchResults.length > 0 ? (
            <ItemList items={searchResults} />
          ) : (
            <p className="text-center text-muted-foreground font-body py-10">
              No items found for your search criteria. Try a different search or clear to browse all items.
            </p>
          )
        ) : allBrowseItems.length > 0 ? ( // Display all browse items if no search active
          <ItemList items={allBrowseItems} />
        ) : (
          <p className="text-center text-muted-foreground font-body py-10">
            No items available for browsing right now. Add yours or check back later!
          </p>
        )}
      </section>
    </div>
  );
}
