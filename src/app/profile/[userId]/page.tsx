
import Image from 'next/image';
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import type { User, Item, UserMotivation, TradeTimingPreference } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Award, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Handshake, Lightbulb, Brain, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Helper function to find user (simulates data fetching)
async function getUserProfile(userId: string): Promise<User | null> {
  // For "me", we can pick the first user or implement logic later
  const actualUserId = userId === 'me' ? dummyUsers[0].id : userId;
  const user = dummyUsers.find((u) => u.id === actualUserId);
  if (!user) return null;
  // Filter items owned by this user
  user.items = dummyItems.filter(item => item.ownerId === user.id);
  return user;
}

// Placeholder for Rating component
const RatingStarsDisplay = ({ score, count }: { score: number, count?: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ))}
    <span className="ml-2 text-sm text-muted-foreground">
      {score.toFixed(1)} {count ? `(${count} ratings)` : ''}
    </span>
  </div>
);

const motivationTextMap: Record<UserMotivation, string> = {
  'help-others': 'Helping Others',
  'maximize-trades': 'Maximizing Trades',
  'convenience-focused': 'Convenience',
  'community-building': 'Community Building',
  'unique-finds': 'Finding Unique Items',
};

const tradeTimingTextMap: Record<TradeTimingPreference, string> = {
  'simultaneous': 'Prefers Simultaneous',
  'staged': 'Open to Staged Trades',
  'flexible': 'Flexible Timing',
};

// Helper function inside UserProfilePage component to generate mock activity summary
const generateMockActivitySummary = (user: User): string => {
    let summary = "Recent Activity Analysis Target:\n";
    const offers = user.items.filter(i => i.listingType === 'offer' && (i.status === 'available' || i.status === 'pending')).slice(0, 2);
    const wants = user.items.filter(i => i.listingType === 'want' && (i.status === 'available' || i.status === 'pending')).slice(0, 1);

    if (offers.length > 0) {
      summary += "\nOffers Listed by User:\n";
      offers.forEach(item => {
        summary += `- "${item.name}" (Category: ${item.category}, Description: "...${item.description.substring(0,30)}...")\n`;
      });
    }
    if (wants.length > 0) {
      summary += "\nWants Listed by User:\n";
      wants.forEach(item => {
        summary += `- "${item.name}" (Seeking in ${item.category}, Description: "...${item.description.substring(0,30)}...")\n`;
      });
    }

    // Add some mock chat snippets based on user ID for variety
    if (user.id === 'user1') { // Alice
      summary += "\nSample Chat Snippets:\n- \"Happy to ship smaller items if needed! Let's build a friendly trading community.\"\n- \"Mainly looking for unique vintage pieces, not so worried about value maximization.\"";
    } else if (user.id === 'user2') { // Bob
      summary += "\nSample Chat Snippets:\n- \"Prefer local pickup for electronics to ensure everything is as described.\"\n- \"Only interested in direct trades for now. What's the best offer you have?\"";
    } else if (user.id === 'user3') { // Charlie
        summary += "\nSample Chat Snippets:\n- \"Quick and easy trades are best for me, happy to help others out!\"\n- \"Open to different kinds of offers, especially for my sustainable goods.\"";
    } else { // Diana, Ethan
      summary += "\nSample Chat Snippets:\n- \"Let's make a fair deal that works for both of us.\"\n- \"Open to discussing details to make the trade smooth.\"";
    }
    return summary.trim();
};


export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const user = await getUserProfile(params.userId);
  const isCurrentUser = params.userId === 'me' || params.userId === dummyUsers[0].id; // Basic check

  if (!user) {
    return <div className="text-center py-10 font-body">User not found.</div>;
  }

  const offeredItems = user.items.filter(item => item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending'));
  const wantedItems = user.items.filter(item => item.listingType === 'want' && (item.status === 'available' || item.status === 'pending'));
  const tradedOrFulfilledItems = user.items.filter(item => item.status === 'traded');

  // Mocked AI preference output for display - varies slightly per user for demo
  const getMockAISuggestions = (currentUser: User) => {
    let suggestions: any = {
        motivations: ['convenience-focused'] as UserMotivation[],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'flexible' as TradeTimingPreference,
        interestedInThirdPartyFulfillment: true,
        confidence: 'Medium',
        reasoning: "General activity suggests a flexible approach to trading."
    };
    if (currentUser.id === 'user1') { // Alice
        suggestions = {
            motivations: ['unique-finds', 'community-building'] as UserMotivation[],
            locationPreference: { isSensitive: false, notes: "Appears flexible with shipping." },
            tradeTimingPreference: 'flexible' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: true,
            confidence: 'High',
            reasoning: "Activity suggests a focus on unique items and positive community interactions. Mentions shipping."
        };
    } else if (currentUser.id === 'user2') { // Bob
        suggestions = {
            motivations: ['maximize-trades'] as UserMotivation[],
            locationPreference: { isSensitive: true, notes: 'Strong preference for local pickup for electronics.' },
            tradeTimingPreference: 'simultaneous' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: false,
            confidence: 'High',
            reasoning: "User seems focused on item value, direct exchanges, and mentions local pickup preferences."
        };
    } else if (currentUser.id === 'user3') { // Charlie
        suggestions = {
            motivations: ['help-others', 'convenience-focused'] as UserMotivation[],
            locationPreference: { isSensitive: false },
            tradeTimingPreference: 'staged' as TradeTimingPreference,
            interestedInThirdPartyFulfillment: true,
            confidence: 'Medium',
            reasoning: "Seems motivated by helping and convenience, likely open to staged trades."
        };
    }
    return suggestions;
  };
  
  const mockAISuggestions = getMockAISuggestions(user);
  const mockActivitySummary = generateMockActivitySummary(user);


  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.dataAiHint || "user profile"} />
            <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <CardTitle className="text-3xl md:text-4xl font-headline mb-1">{user.name}</CardTitle>
            <RatingStarsDisplay score={user.rating} count={user.tradesCompleted} />
            <p className="font-body text-muted-foreground mt-2 max-w-xl">{user.bio || "This user hasn't added a bio yet."}</p>
          </div>
          {isCurrentUser ? (
            <Button variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          ) : (
             <Button variant="default" className="bg-primary hover:bg-primary/90">
              <MessageSquare className="mr-2 h-4 w-4" /> Message User
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-background rounded-lg">
                <Gift className="h-8 w-8 text-green-600 mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.items.filter(i => i.listingType === 'offer').length}</p>
                <p className="text-sm text-muted-foreground font-body">Items Offered</p>
            </div>
             <div className="p-4 bg-background rounded-lg">
                <Search className="h-8 w-8 text-blue-600 mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.items.filter(i => i.listingType === 'want').length}</p>
                <p className="text-sm text-muted-foreground font-body">Items Wanted</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
                <Repeat className="h-8 w-8 text-accent mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.tradesCompleted}</p>
                <p className="text-sm text-muted-foreground font-body">Trades Completed / Wants Fulfilled</p>
            </div>
        </CardContent>
      </Card>

      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            Trading Style & Preferences
          </CardTitle>
          <CardDescription className="font-body">
            Insights into how {user.name} likes to trade. This can help AI find better matches.
            {isCurrentUser && " (You can change these in 'Edit Profile' - coming soon!)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div>
            <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground"/>3rd Party Fulfillments:</h4>
            <Badge variant={user.interestedInThirdPartyFulfillment ? "default" : "secondary"} className="text-xs">
              {user.interestedInThirdPartyFulfillment ? "Open to it" : "Prefers direct trades"}
            </Badge>
          </div>
          
          {user.motivations && user.motivations.length > 0 && (
            <div>
              <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-muted-foreground"/>Motivations:</h4>
              <div className="flex flex-wrap gap-1.5">
                {user.motivations.map(motivation => (
                  <Badge key={motivation} variant="outline" className="text-xs">{motivationTextMap[motivation] || motivation}</Badge>
                ))}
              </div>
            </div>
          )}

          {user.locationPreference && (
            <div>
              <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/>Location Preference:</h4>
              <Badge variant={user.locationPreference.isSensitive ? "secondary" : "outline"} className="text-xs">
                {user.locationPreference.isSensitive ? "Location Sensitive" : "Location Flexible"}
              </Badge>
              {user.locationPreference.isSensitive && user.locationPreference.notes && (
                <p className="text-xs text-muted-foreground font-body italic mt-1">{user.locationPreference.notes}</p>
              )}
            </div>
          )}

          {user.tradeTimingPreference && (
            <div>
              <h4 className="font-headline text-md mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/>Trade Timing:</h4>
               <Badge variant="outline" className="text-xs">
                {tradeTimingTextMap[user.tradeTimingPreference] || user.tradeTimingPreference}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* AI Preference Insights Card */}
      <UserProfileAIInsights user={user} mockAISuggestions={mockAISuggestions} mockActivitySummary={mockActivitySummary} />

      <Separator />

      <section>
        <h2 className="text-2xl font-headline mb-4 flex items-center gap-2">
            <Gift className="h-6 w-6 text-green-600" />
            Items Offered ({offeredItems.length})
        </h2>
        {offeredItems.length > 0 ? <ItemList items={offeredItems} /> : <p className="text-muted-foreground font-body">This user has no items currently offered for trade.</p>}
      </section>

      <Separator />

       <section>
        <h2 className="text-2xl font-headline mb-4 flex items-center gap-2">
            <Search className="h-6 w-6 text-blue-600" />
            Items Wanted ({wantedItems.length})
        </h2>
        {wantedItems.length > 0 ? <ItemList items={wantedItems} /> : <p className="text-muted-foreground font-body">This user is not currently looking for any specific items.</p>}
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl font-headline mb-4">Trade & Fulfillment History ({tradedOrFulfilledItems.length})</h2>
        {tradedOrFulfilledItems.length > 0 ? <ItemList items={tradedOrFulfilledItems} /> : <p className="text-muted-foreground font-body">No completed trades or fulfilled wants yet.</p>}
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl font-headline mb-4">User Reviews & Ratings</h2>
        <Card>
            <CardContent className="p-6">
                <p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}

// Extracted client component for AI Insights section
function UserProfileAIInsights({ user, mockAISuggestions, mockActivitySummary }: { user: User, mockAISuggestions: any, mockActivitySummary: string }) {
  const [showSampleActivity, setShowSampleActivity] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <Brain className="h-6 w-6 text-accent" />
          AI Preference Insights (Experimental)
        </CardTitle>
        <CardDescription className="font-body">
          Understanding how AI might learn and suggest trading preferences for {user.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible open={showSampleActivity} onOpenChange={setShowSampleActivity}>
          <div className="space-y-2">
            <p className="text-sm font-body text-muted-foreground">
              Our AI can learn preferences by analyzing activity like item listings and chat interactions.
            </p>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full flex justify-between items-center text-left">
                <span className="flex-grow">{showSampleActivity ? 'Hide' : 'Show'} Sample Activity Data AI Might Use</span>
                {showSampleActivity ? <ChevronUp className="h-4 w-4 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 ml-2 shrink-0" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-4 space-y-2">
            <div className="p-3 bg-muted/30 rounded-md border">
              <h4 className="font-headline text-[0.9rem] mb-1.5 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground"/>
                Sample Activity Data for {user.name}
              </h4>
              <pre className="text-xs font-code whitespace-pre-wrap text-foreground/80 p-2 bg-background rounded-sm overflow-x-auto">
                {mockActivitySummary}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator/>

        <div>
          <h4 className="font-headline text-md mb-2">Simulated AI Preference Suggestions:</h4>
          <p className="text-sm font-body text-muted-foreground mb-3">
            Based on data like the sample above, AI might make these suggestions for {user.name}&apos;s preferences:
          </p>
          <div className="p-4 border rounded-md bg-background space-y-3">
            {mockAISuggestions.motivations && mockAISuggestions.motivations.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Motivations:</h5>
                <div className="flex flex-wrap gap-1.5">
                  {mockAISuggestions.motivations.map((m: UserMotivation) => <Badge key={m} variant="secondary" className="text-xs">{motivationTextMap[m] || m}</Badge>)}
                </div>
              </div>
            )}
            {mockAISuggestions.locationPreference && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Location:</h5>
                <Badge variant="secondary" className="text-xs">
                  {mockAISuggestions.locationPreference.isSensitive ? `Sensitive (${mockAISuggestions.locationPreference.notes || 'Notes unavailable'})` : 'Flexible'}
                </Badge>
              </div>
            )}
            {mockAISuggestions.tradeTimingPreference && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">Trade Timing:</h5>
                <Badge variant="secondary" className="text-xs">{tradeTimingTextMap[mockAISuggestions.tradeTimingPreference] || mockAISuggestions.tradeTimingPreference}</Badge>
              </div>
            )}
            {mockAISuggestions.interestedInThirdPartyFulfillment !== undefined && (
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">3rd Party Fulfillment:</h5>
                <Badge variant="secondary" className="text-xs">{mockAISuggestions.interestedInThirdPartyFulfillment ? 'Likely Open' : 'Likely Prefers Direct'}</Badge>
              </div>
            )}
            {mockAISuggestions.confidence && (
              <div className="pt-2">
                <h5 className="text-xs font-semibold text-muted-foreground mb-0.5">AI Confidence: <Badge variant="outline" className="ml-1 py-0 px-1.5 text-[0.65rem]">{mockAISuggestions.confidence}</Badge></h5>
                {mockAISuggestions.reasoning && <p className="text-xs italic text-muted-foreground">{mockAISuggestions.reasoning}</p>}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-body italic mt-3">
            These are illustrative examples. Actual AI-driven preference setting would involve ongoing learning and user confirmation (e.g., in &quot;Edit Profile&quot;).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

