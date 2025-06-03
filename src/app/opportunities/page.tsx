
// src/app/opportunities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ArrowRightLeft, Eye, Gift, Search, Star, Handshake, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { suggestMatchingItems, type ItemMatchOutput } from '@/ai/flows/item-match-flow';


// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  return { item, owner };
}

// Display component for each item in the opportunity
function OpportunityItemCard({
    item,
    owner,
    opportunityContextLabel,
}: {
    item: Item;
    owner: User;
    opportunityContextLabel: string;
}) {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            {item.listingType === 'offer' ? <Gift className="h-5 w-5 text-green-600 shrink-0" /> : <Search className="h-5 w-5 text-blue-600 shrink-0" />}
            <CardTitle className="font-headline text-xl line-clamp-2">
                {item.name}
            </CardTitle>
        </div>
        <Badge variant="secondary" className="text-xs py-0.5 px-2 w-fit">{opportunityContextLabel}</Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0">
        <div className="aspect-video relative w-full rounded-md overflow-hidden border">
          <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint || "opportunity item"}
          />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 font-body">{item.description}</p>
        <div className="flex items-center gap-2 pt-2 border-t border-dashed">
          <Avatar className="h-8 w-8">
            <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"}/>
            <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Link href={`/profile/${owner.id}`} className="text-sm font-semibold hover:text-primary">{owner.name}</Link>
           <div className="flex items-center text-xs text-muted-foreground ml-auto">
            <Star className="h-3 w-3 mr-0.5 text-yellow-400 fill-yellow-400" />
            {owner.rating.toFixed(1)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Button asChild variant="default" size="sm" className="w-full bg-primary hover:bg-primary/90">
          <Link href={`/items/${item.id}`}><Eye className="mr-2 h-4 w-4" /> View Full Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function OpportunityMatchPage() {
  const searchParams = useSearchParams();
  const mainItemIdQuery = searchParams.get('mainItemId');
  const suggestedItemIdQuery = searchParams.get('suggestedItemId');

  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [loading, setLoading] = useState(true);
  const [opportunityReasoning, setOpportunityReasoning] = useState<string | null>(null);
  const [loadingReasoning, setLoadingReasoning] = useState(false);

  const currentUserId = dummyUsers[0].id; // Simulate current user

  useEffect(() => {
    async function fetchDataAndReasoning() {
      setLoading(true);
      setOpportunityReasoning(null);
      const mainD = await getItemAndOwner(mainItemIdQuery);
      const suggestedD = await getItemAndOwner(suggestedItemIdQuery);

      if (mainD && suggestedD) {
        setMainItemDetails(mainD);
        setSuggestedItemDetails(suggestedD);
        
        // Fetch reasoning for this specific opportunity
        setLoadingReasoning(true);
        try {
            const inputForReasoning: Parameters<typeof suggestMatchingItems>[0] = {
                triggeringUserId: currentUserId,
                currentItem: {
                    id: mainD.item.id,
                    name: mainD.item.name,
                    description: mainD.item.description,
                    category: mainD.item.category,
                    ownerId: mainD.item.ownerId,
                    listingType: mainD.item.listingType,
                },
                availableItems: [{ // Only the suggested item is "available" for this reasoning context
                    id: suggestedD.item.id,
                    name: suggestedD.item.name,
                    description: suggestedD.item.description,
                    category: suggestedD.item.category,
                    ownerId: suggestedD.item.ownerId,
                    listingType: suggestedD.item.listingType,
                }],
            };
            const reasoningResult: ItemMatchOutput = await suggestMatchingItems(inputForReasoning);
            if (reasoningResult.reasoning && !reasoningResult.reasoning.toLowerCase().includes('error') && !reasoningResult.reasoning.toLowerCase().includes('could not')) {
                 setOpportunityReasoning(reasoningResult.reasoning);
            } else if (reasoningResult.reasoning) {
                setOpportunityReasoning("AI could not provide specific reasoning for this pairing at the moment.");
            } else {
                setOpportunityReasoning("AI did not provide reasoning for this match.");
            }
        } catch (error) {
            console.error("Error fetching opportunity reasoning:", error);
            setOpportunityReasoning("Could not load AI reasoning for this match.");
        } finally {
            setLoadingReasoning(false);
        }

      } else {
        setMainItemDetails(null);
        setSuggestedItemDetails(null);
      }
      setLoading(false);
    }
    if (mainItemIdQuery && suggestedItemIdQuery) {
        fetchDataAndReasoning();
    } else {
        setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainItemIdQuery, suggestedItemIdQuery]);

  if (loading) {
    return <div className="text-center py-10 font-body flex items-center justify-center gap-2"><ArrowRightLeft className="h-5 w-5 animate-spin" /> Loading opportunity details...</div>;
  }

  if (!mainItemDetails || !suggestedItemDetails) {
    return <div className="text-center py-10 font-body text-destructive">Could not load opportunity. Items may be invalid or no longer available. Ensure both mainItemId and suggestedItemId are provided.</div>;
  }

  const { item: mainItem, owner: mainItemOwner } = mainItemDetails;
  const { item: suggestedItem, owner: suggestedItemOwner } = suggestedItemDetails;

  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;
  let mainItemOpportunityLabel = '';
  let suggestedItemOpportunityLabel = '';

  if (mainItem.ownerId === currentUserId) {
    mainItemOpportunityLabel = `Your ${mainItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
    if (suggestedItem.listingType === 'want') {
      suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s Matching Want`;
      tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
      chatButtonText = `Offer your "${mainItem.name}" for their want: "${suggestedItem.name}"`;
    } else { 
      suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s Matching Offer`;
      tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
      chatButtonText = `Negotiate for "${suggestedItem.name}" (Offering your "${mainItem.name}")`;
    }
  } else if (suggestedItem.ownerId === currentUserId) { 
    suggestedItemOpportunityLabel = `Your ${suggestedItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
     if (mainItem.listingType === 'want') {
      mainItemOpportunityLabel = `${mainItemOwner.name}'s Matching Want`;
      tradeId = `trade-${suggestedItem.ownerId}-wants-${mainItem.id}-from-${mainItem.ownerId}`; 
      chatButtonText = `Offer your "${suggestedItem.name}" for their want: "${mainItem.name}"`;
    } else { 
      mainItemOpportunityLabel = `${mainItemOwner.name}'s Matching Offer`;
      tradeId = `trade-${currentUserId}-wants-${mainItem.id}-from-${mainItem.ownerId}`;
      chatButtonText = `Negotiate for "${mainItem.name}" (Offering your "${suggestedItem.name}")`;
    }
  } else { 
    mainItemOpportunityLabel = `${mainItemOwner.name}'s ${mainItem.listingType === 'offer' ? 'Offer' : 'Want'}`;
    suggestedItemOpportunityLabel = `${suggestedItemOwner.name}'s ${suggestedItem.listingType === 'offer' ? 'Matching Offer' : 'Matching Want'}`;
    // For non-user-involved opportunities, generate a more generic discussion ID
    // This specific tradeId format is for direct negotiation start.
    // If neither item belongs to the current user, direct chat might not be the primary action from this page.
    // However, for demo purposes, we can still create a link if needed, or guide user to item pages.
    tradeId = `discuss-${mainItem.id}-with-${suggestedItem.id}`; // A generic ID
    chatButtonText = `Discuss This Opportunity`;
    // Potentially disable direct chat button or change its text if current user owns neither.
    // For now, assume a discussion can be initiated.
  }
   if (mainItem.ownerId === currentUserId && suggestedItem.ownerId === currentUserId) {
    negotiationContextValid = false; // User can't trade with themselves
    chatButtonText = "View Items Separately"; // Or some other appropriate text
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center pb-4">
          <Handshake className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            AI suggests a potential match. Explore the details and see if it's a fit!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {loadingReasoning && (
            <div className="text-center text-muted-foreground font-body py-3 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading AI Reasoning...
            </div>
           )}
           {!loadingReasoning && opportunityReasoning && (
             <Card className="bg-muted/50 border-primary/30">
                <CardHeader className="pb-2 pt-3">
                    <CardTitle className="font-headline text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/>AI's Rationale for this Match</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm font-body text-muted-foreground italic">{opportunityReasoning}</p>
                </CardContent>
             </Card>
           )}
           <div className="hidden md:flex items-center justify-center my-4">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 items-start">
            <OpportunityItemCard
                item={mainItem}
                owner={mainItemOwner}
                opportunityContextLabel={mainItemOpportunityLabel}
            />
            <OpportunityItemCard
                item={suggestedItem}
                owner={suggestedItemOwner}
                opportunityContextLabel={suggestedItemOpportunityLabel}
            />
          </div>
          <Separator className="my-6 md:my-8" />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-3">Ready to Discuss?</h3>
            {negotiationContextValid && tradeId ? (
                 <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-base">
                    <Link href={`/trades/${tradeId}`}>
                        <MessageSquare className="mr-2 h-5 w-5" /> {chatButtonText}
                    </Link>
                </Button>
            ) : (
                <div className="space-y-2">
                    <p className="text-muted-foreground font-body">
                        This opportunity may involve items from multiple other users or your own items where direct negotiation isn't straightforward from this view.
                        Please visit the individual item pages to initiate contact or explore further.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button asChild><Link href={`/items/${mainItem.id}`}>View {mainItem.name}</Link></Button>
                        <Button asChild><Link href={`/items/${suggestedItem.id}`}>View {suggestedItem.name}</Link></Button>
                    </div>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

