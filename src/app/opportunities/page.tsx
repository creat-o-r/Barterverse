
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
import { MessageSquare, ArrowRightLeft, Eye, Gift, Search, Star, Handshake, FileText, Loader2, AlertCircle, Info, Flag, FileWarning, HeartHandshake, PackagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { explainMatchRationale, type ExplainMatchRationaleOutput, type ExplainMatchRationaleInput } from '@/ai/flows/explain-match-rationale-flow';
import { logFeedbackEntry } from '@/services/feedback-service';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils'; // Added this import


// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  // Ensure isGiftItForward is a boolean for logic downstream
  return { item: { ...item, isGiftItForward: !!item.isGiftItForward }, owner };
}

// Display component for each item in the opportunity
function OpportunityItemCard({
    item,
    owner,
    opportunityContextLabel,
    isReciprocal = false,
    cardClassName,
}: {
    item: Item;
    owner: User;
    opportunityContextLabel: string;
    isReciprocal?: boolean;
    cardClassName?: string;
}) {
  return (
    <Card className={cn(`flex flex-col h-full shadow-lg ${isReciprocal ? 'bg-accent/10 border-accent/50' : ''}`, cardClassName)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            {item.listingType === 'offer' ? (item.isGiftItForward ? <HeartHandshake className="h-5 w-5 text-pink-500 shrink-0" /> : <Gift className="h-5 w-5 text-green-600 shrink-0" />) : <Search className="h-5 w-5 text-blue-600 shrink-0" />}
            <CardTitle className="font-headline text-xl line-clamp-2">
                {item.name}
            </CardTitle>
        </div>
        <Badge variant="secondary" className={`text-xs py-0.5 px-2 w-fit ${isReciprocal ? 'bg-accent text-accent-foreground' : ''}`}>{opportunityContextLabel}</Badge>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0">
        <div className="aspect-video relative w-full rounded-md overflow-hidden border">
          <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            fill
            className="object-cover"
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
        <Button asChild variant="default" size="sm" className={`w-full ${isReciprocal ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : 'bg-primary hover:bg-primary/90'}`}>
          <Link href={`/items/${item.id}`}><Eye className="mr-2 h-4 w-4" /> View Full Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

const generalMatchScoreCriteria: Record<string, { title: string; points: string[] }> = {
  high: {
    title: "What a \"High\" Match Score Generally Means:",
    points: [
      "Strong direct relevance between items.",
      "Categories are very similar or highly complementary.",
      "Keywords in names/descriptions show clear overlap or direct need fulfillment.",
      "Offer/Want types align well (e.g., an offer fulfilling a specific want).",
      "If both are 'offer' or 'want', they are desirable items in the same niche.",
      "Gift It Forward items fulfilling a want are often high matches.",
      "Strong reciprocal potential: the other user offers something you likely want.",
    ],
  },
  medium: {
    title: "What a \"Medium\" Match Score Generally Means:",
    points: [
      "Good general relevance.",
      "Categories are related or appeal to similar users.",
      "Some overlap in keywords or purpose.",
      "A plausible trade scenario, even if not a perfect keyword match.",
      "Some reciprocal potential: the other user offers something that might interest you.",
    ],
  },
  low: {
    title: "What a \"Low\" Match Score Generally Means:",
    points: [
      "Possible, but less direct, relevance.",
      "Categories might be different but could have niche appeal or indirect connection.",
      "Loose association by theme or potential utility not immediately obvious.",
      "Could be interesting for users with broad interests or unstated needs.",
      "Little to no obvious reciprocal item offered by the other user.",
    ],
  },
};


export default function OpportunityMatchPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const mainItemIdQuery = searchParams.get('mainItemId');
  const suggestedItemIdQuery = searchParams.get('suggestedItemId');
  const matchScoreQuery = searchParams.get('score');
  const reciprocalItemIdQuery = searchParams.get('reciprocalItemId');


  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [reciprocalItemDetails, setReciprocalItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [loading, setLoading] = useState(true);
  const [opportunityReasoning, setOpportunityReasoning] = useState<string | null>(null);
  const [loadingReasoning, setLoadingReasoning] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<string | null>(null);
  const [isReportingScore, setIsReportingScore] = useState(false);
  const [isReportingReasoning, setIsReportingReasoning] = useState(false);

  const currentUser = dummyUsers[0]; // Simulate current user

  useEffect(() => {
    async function fetchDataAndReasoning() {
      setLoading(true);
      setMainItemDetails(null);
      setSuggestedItemDetails(null);
      setReciprocalItemDetails(null);
      setOpportunityReasoning(null);
      setInsightsError(null);
      
      const scoreFromQuery = matchScoreQuery?.toLowerCase() || null;
      setMatchScore(scoreFromQuery);

      const mainPromise = getItemAndOwner(mainItemIdQuery);
      const suggestedPromise = getItemAndOwner(suggestedItemIdQuery);
      const reciprocalPromise = reciprocalItemIdQuery ? getItemAndOwner(reciprocalItemIdQuery) : Promise.resolve(null);

      const [mainD, suggestedD, reciprocalD] = await Promise.all([mainPromise, suggestedPromise, reciprocalPromise]);

      if (mainD && suggestedD) {
        setMainItemDetails(mainD);
        setSuggestedItemDetails(suggestedD);
        if (reciprocalD) {
          setReciprocalItemDetails(reciprocalD);
        }
        
        setLoadingReasoning(true);
        try {
            const inputForRationale: ExplainMatchRationaleInput = {
                itemA: {
                    name: mainD.item.name,
                    description: mainD.item.description,
                    category: mainD.item.category,
                    listingType: mainD.item.listingType,
                    isGiftItForward: !!mainD.item.isGiftItForward,
                },
                itemB: {
                    name: suggestedD.item.name,
                    description: suggestedD.item.description,
                    category: suggestedD.item.category,
                    listingType: suggestedD.item.listingType,
                    isGiftItForward: !!suggestedD.item.isGiftItForward,
                }
            };

            if (reciprocalD) {
                inputForRationale.itemC = {
                    name: reciprocalD.item.name,
                    description: reciprocalD.item.description,
                    category: reciprocalD.item.category,
                    listingType: reciprocalD.item.listingType,
                    isGiftItForward: !!reciprocalD.item.isGiftItForward,
                };
            }
            
            const rationaleResult: ExplainMatchRationaleOutput = await explainMatchRationale(inputForRationale);
            
            if (rationaleResult.errorMessage) {
                setInsightsError(rationaleResult.errorMessage);
                setOpportunityReasoning("Could not load AI rationale: " + rationaleResult.errorMessage); 
            } else if (rationaleResult.rationale) {
                 setOpportunityReasoning(rationaleResult.rationale);
            } else {
                const defaultError = "AI did not provide reasoning for this specific match.";
                setInsightsError(defaultError);
                setOpportunityReasoning(defaultError);
            }
        } catch (error: any) {
            console.error("Error fetching opportunity rationale:", error);
            const fetchErrorMsg = "Could not load AI rationale for this match due to a system error. " + (error.message || "");
            setInsightsError(fetchErrorMsg);
            setOpportunityReasoning(fetchErrorMsg);
        } finally {
            setLoadingReasoning(false);
        }

      } else {
        setMainItemDetails(null);
        setSuggestedItemDetails(null);
        setReciprocalItemDetails(null);
      }
      setLoading(false);
    }
    if (mainItemIdQuery && suggestedItemIdQuery) {
        fetchDataAndReasoning();
    } else {
        setLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainItemIdQuery, suggestedItemIdQuery, matchScoreQuery, reciprocalItemIdQuery, currentUser.id]);

  const handleReportScore = async () => {
    if (!matchScore) return;
    setIsReportingScore(true);
    try {
      const result = await logFeedbackEntry({
        feedbackType: 'match-score',
        reportedValue: matchScore,
        mainItemId: mainItemIdQuery,
        suggestedItemId: suggestedItemIdQuery,
        reportingUserId: currentUser.id,
      });
      if (result.success) {
        toast({ title: "Score Reported", description: "Thank you for your feedback on the match score!" });
      } else {
        toast({ title: "Report Failed", description: result.message || "Could not log score feedback.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Report Error", description: "An error occurred while reporting the score.", variant: "destructive" });
    } finally {
      setIsReportingScore(false);
    }
  };

  const handleReportReasoning = async () => {
    if (!opportunityReasoning) return;
    setIsReportingReasoning(true);
    try {
      const result = await logFeedbackEntry({
        feedbackType: 'match-reasoning',
        reportedValue: opportunityReasoning,
        mainItemId: mainItemIdQuery,
        suggestedItemId: suggestedItemIdQuery,
        reportingUserId: currentUser.id,
      });
      if (result.success) {
        toast({ title: "Reasoning Reported", description: "Thank you for your feedback on the reasoning!" });
      } else {
        toast({ title: "Report Failed", description: result.message || "Could not log reasoning feedback.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Report Error", description: "An error occurred while reporting the reasoning.", variant: "destructive" });
    } finally {
      setIsReportingReasoning(false);
    }
  };


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
  let pageTitle = "Trade Opportunity";
  let pageDescription = "AI suggests a potential match. Explore the details and see if it's a fit!";
  let actionButtonIcon = <MessageSquare className="mr-2 h-5 w-5" />;

  const mainIsGiftOffer = mainItem.listingType === 'offer' && mainItem.isGiftItForward;
  const suggestedIsGiftOffer = suggestedItem.listingType === 'offer' && suggestedItem.isGiftItForward;

  if (mainIsGiftOffer && suggestedItem.listingType === 'want') {
    pageTitle = "Potential Gift Fulfillment";
    pageDescription = `Your gift "${mainItem.name}" could fulfill a want from ${suggestedItemOwner.name}.`;
    chatButtonText = `Contact ${suggestedItemOwner.name} about Gifting`;
    actionButtonLink = `/profile/${suggestedItemOwner.id}`; 
    actionButtonIcon = <HeartHandshake className="mr-2 h-5 w-5" />;
  } else if (mainItem.listingType === 'want' && suggestedIsGiftOffer) {
    pageTitle = "Potential Gift Found!";
    pageDescription = `A gift "${suggestedItem.name}" from ${suggestedItemOwner.name} might fulfill your want!`;
    chatButtonText = `View Gift & Contact ${suggestedItemOwner.name}`;
    actionButtonLink = `/items/${suggestedItem.id}`; 
    actionButtonIcon = <Gift className="mr-2 h-5 w-5" />;
  } else {
    pageTitle = "Trade Opportunity";
    if (mainItem.ownerId === currentUser.id) { // Current user is viewing their own item as the 'main item' context for the suggestion
      tradeId = `trade-${currentUser.id}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
      chatButtonText = `Negotiate for "${suggestedItem.name}"`;
    } else { // Current user is viewing someone else's item ('mainItem') and was suggested one of their own items or another item
      // This case needs careful tradeId construction. Assume 'mainItem' is what they're viewing (other's),
      // and 'suggestedItem' is what they might trade for it.
      // If suggestedItem is THEIRS, then the other person (mainItemOwner) wants suggestedItem.
      // If suggestedItem is ALSO OTHER'S, it's a more complex suggestion.
      // For simplicity, if mainItem is NOT current user's, we assume current user WANTS mainItem.
      tradeId = `trade-${currentUser.id}-wants-${mainItem.id}-from-${mainItem.ownerId}`;
      chatButtonText = `Negotiate for "${mainItem.name}"`;
    }
    if (mainItem.ownerId === currentUser.id && suggestedItem.ownerId === currentUser.id) {
       chatButtonText = "View Items (Cannot trade with self)"; 
       actionButtonLink = `/items/${mainItem.id}`; // Or some other sensible link
    } else {
        actionButtonLink = `/trades/${tradeId}`;
    }
  }
   
  const scoreCriteria = matchScore ? generalMatchScoreCriteria[matchScore] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center pb-4">
          {mainIsGiftOffer || suggestedIsGiftOffer ? <HeartHandshake className="mx-auto h-10 w-10 text-pink-500 mb-2" /> : <Handshake className="mx-auto h-10 w-10 text-primary mb-2" />}
          <CardTitle className="font-headline text-3xl">{pageTitle}</CardTitle>
          <CardDescription className="font-body">
            {pageDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="text-center my-4">
            <h3 className="font-headline text-2xl text-foreground/90">Proposed Exchange</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-4 md:gap-6">
            <OpportunityItemCard
                item={mainItem}
                owner={mainItemOwner}
                opportunityContextLabel={mainItem.ownerId === currentUser.id ? `Your ${mainItem.listingType}` : `${mainItemOwner.name}'s ${mainItem.listingType}`}
                cardClassName="border-primary/30"
            />
            <div className="hidden md:flex items-center justify-center">
                <ArrowRightLeft className="h-10 w-10 text-muted-foreground" />
            </div>
             <div className="block md:hidden text-center my-2">
                <ArrowRightLeft className="h-8 w-8 text-muted-foreground mx-auto rotate-90" />
            </div>

            <div className="flex flex-col gap-4">
              <OpportunityItemCard
                  item={suggestedItem}
                  owner={suggestedItemOwner}
                  opportunityContextLabel={suggestedItem.ownerId === currentUser.id ? `Your ${suggestedItem.listingType}` : `${suggestedItemOwner.name}'s ${suggestedItem.listingType}`}
                  cardClassName="border-primary/30"
              />
              {reciprocalItemDetails && suggestedItemDetails && (
                <div className="mt-2 p-3 border-l-4 border-accent bg-accent/5 rounded-md shadow-sm">
                  <h4 className="font-headline text-md text-accent-foreground flex items-center gap-1.5 mb-2">
                    <PackagePlus className="h-5 w-5" />
                    Also from {suggestedItemDetails.owner.name} (For You):
                  </h4>
                  <OpportunityItemCard
                    item={reciprocalItemDetails.item}
                    owner={reciprocalItemDetails.owner}
                    opportunityContextLabel={`Their Additional Offer`}
                    isReciprocal={true}
                    cardClassName="shadow-none border-accent/40"
                  />
                </div>
              )}
            </div>
          </div>


          <div className="mt-6 pt-6 border-t">
            {loadingReasoning && (
                <div className="text-center text-muted-foreground font-body py-3 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading AI Insights...
                </div>
            )}
            {!loadingReasoning && (opportunityReasoning || matchScore || insightsError) && (
                <Card className={insightsError ? "border-destructive/50 bg-destructive/5" : "bg-muted/30 border-primary/30"}>
                    <CardHeader className="pb-2 pt-3">
                        <CardTitle className={`font-headline text-lg flex items-center gap-2 ${insightsError ? 'text-destructive-foreground' : 'text-primary'}`}>
                            {insightsError && !opportunityReasoning ? <AlertCircle className="h-5 w-5"/> : <Info className="h-5 w-5"/>}
                            AI Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        {matchScore && !insightsError && (
                            <div className="mb-3">
                                <span className="font-semibold text-sm">Match Score: </span>
                                <Badge variant={
                                    matchScore.toLowerCase() === 'high' ? 'default' :
                                    matchScore.toLowerCase() === 'medium' ? 'secondary' :
                                    'outline' 
                                } className="capitalize text-sm py-1 px-2.5">
                                    {matchScore}
                                </Badge>
                            </div>
                        )}
                        {scoreCriteria && !insightsError && (
                            <div className="mb-3">
                                <h4 className="font-semibold text-sm mb-1">{scoreCriteria.title}</h4>
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 font-body">
                                    {scoreCriteria.points.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {opportunityReasoning && (
                             <div>
                                <span className="font-semibold text-sm">AI Rationale for this Specific Match{reciprocalItemIdQuery ? " (including reciprocal item)" : ""}: </span>
                                <p className={`text-sm font-body ${insightsError ? 'text-destructive-foreground/90' : 'text-muted-foreground'}`}>{opportunityReasoning}</p>
                             </div>
                        )}
                         {!opportunityReasoning && insightsError && !matchScore && ( 
                            <p className="text-sm font-body text-destructive-foreground/90">{insightsError}</p>
                        )}
                         {!opportunityReasoning && !insightsError && !matchScore && !scoreCriteria && ( 
                            <p className="text-sm font-body text-muted-foreground">No AI insights available for this specific pairing.</p>
                        )}
                    </CardContent>
                    <CardFooter className="pt-4 flex flex-col sm:flex-row gap-2 justify-end border-t mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReportScore}
                        disabled={isReportingScore || !matchScore || !!insightsError || loadingReasoning}
                        className="text-xs"
                      >
                        {isReportingScore ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Flag className="mr-1.5 h-3.5 w-3.5" />}
                        Report Score
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReportReasoning}
                        disabled={isReportingReasoning || !opportunityReasoning || !!insightsError || loadingReasoning}
                        className="text-xs"
                      >
                        {isReportingReasoning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileWarning className="mr-1.5 h-3.5 w-3.5" />}
                        Report Reasoning
                      </Button>
                    </CardFooter>
                </Card>
            )}
          </div>
          
          <Separator className="my-6 md:my-8" />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-3">Ready to Proceed?</h3>
            {actionButtonLink ? (
                 <Button asChild size="lg" className={`${mainIsGiftOffer || suggestedIsGiftOffer ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-accent hover:bg-accent/90 text-accent-foreground'} px-8 py-6 text-base`}>
                    <Link href={actionButtonLink}>
                        {actionButtonIcon} {chatButtonText}
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

