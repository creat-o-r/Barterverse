import Image from 'next/image';
import { dummyUsers, dummyItems } from '@/lib/dummy-data';
import type { User, Item } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ItemList from '@/components/items/ItemList';
import { Star, Package, MessageSquare, Award, Edit3, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

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


export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const user = await getUserProfile(params.userId);
  const isCurrentUser = params.userId === 'me'; // Basic check

  if (!user) {
    return <div className="text-center py-10 font-body">User not found.</div>;
  }

  const availableItems = user.items.filter(item => item.status === 'available' || item.status === 'pending');
  const tradedItems = user.items.filter(item => item.status === 'traded');

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
                <Package className="h-8 w-8 text-primary mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.items.length}</p>
                <p className="text-sm text-muted-foreground font-body">Items Listed</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
                <Repeat className="h-8 w-8 text-accent mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.tradesCompleted}</p>
                <p className="text-sm text-muted-foreground font-body">Trades Completed</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
                <Award className="h-8 w-8 text-yellow-500 mx-auto mb-2"/>
                <p className="text-2xl font-headline">{user.rating.toFixed(1)} / 5.0</p>
                <p className="text-sm text-muted-foreground font-body">Average Rating</p>
            </div>
        </CardContent>
      </Card>
      
      <Separator />

      <section>
        <h2 className="text-2xl font-headline mb-4">Items Available for Trade ({availableItems.length})</h2>
        {availableItems.length > 0 ? <ItemList items={availableItems} /> : <p className="text-muted-foreground font-body">This user has no items currently available for trade.</p>}
      </section>

      <Separator />
      
      <section>
        <h2 className="text-2xl font-headline mb-4">Trade History ({tradedItems.length} Traded)</h2>
        {tradedItems.length > 0 ? <ItemList items={tradedItems} /> : <p className="text-muted-foreground font-body">No traded items yet.</p>}
        {/* In a real app, this would list actual trades and ratings received */}
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl font-headline mb-4">User Reviews & Ratings</h2>
        <Card>
            <CardContent className="p-6">
                <p className="text-muted-foreground font-body">User reviews and ratings will be displayed here.</p>
                {/* Example Review Structure 
                <div className="border-b py-4 last:border-b-0">
                    <div className="flex items-center mb-1">
                        <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="https://placehold.co/40x40.png?text=R" alt="Reviewer" />
                            <AvatarFallback>R</AvatarFallback>
                        </Avatar>
                        <span className="font-headline text-sm">Reviewer Name</span>
                        <RatingStarsDisplay score={5} />
                    </div>
                    <p className="text-sm font-body text-foreground/80">"Great trader, item as described. Smooth transaction!"</p>
                </div>
                */}
            </CardContent>
        </Card>
      </section>
    </div>
  );
}
