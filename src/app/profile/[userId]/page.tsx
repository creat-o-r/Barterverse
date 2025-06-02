
import Image from 'next/image';
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import type { User, Item, UserMotivation, TradeTimingPreference } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Award, Edit3, Repeat, Gift, Search, Network, MapPin, Sparkles, Clock, Users, Handshake, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const user = await getUserProfile(params.userId);
  const isCurrentUser = params.userId === 'me' || params.userId === dummyUsers[0].id; // Basic check

  if (!user) {
    return <div className="text-center py-10 font-body">User not found.</div>;
  }

  const offeredItems = user.items.filter(item => item.listingType === 'offer' && (item.status === 'available' || item.status === 'pending'));
  const wantedItems = user.items.filter(item => item.listingType === 'want' && (item.status === 'available' || item.status === 'pending'));
  const tradedOrFulfilledItems = user.items.filter(item => item.status === 'traded');

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

           {isCurrentUser && (
             <p className="text-xs text-muted-foreground font-body italic pt-2 border-t border-dashed mt-4">
                You can change your trading preferences in the &quot;Edit Profile&quot; section (coming soon).
            </p>
           )}
        </CardContent>
      </Card>

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
