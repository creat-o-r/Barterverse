"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, CheckCircle, XCircle, Hourglass, Bot, Loader2 } from 'lucide-react';
import type { TradeOffer, Item, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getTradesForUser, getAllItems, getAllUsers } from '@/lib/firebase/firestoreUtils';
import GeneralChatWindow from '@/components/chat/GeneralChatWindow';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

const StatusIcon = ({ status }: { status: TradeOffer['status'] }) => {
  switch (status) {
    case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'accepted': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'completed': return <Repeat className="h-5 w-5 text-blue-500" />;
    case 'cancelled': return <XCircle className="h-5 w-5 text-gray-400" />;
    default: return <MessageSquare className="h-5 w-5 text-gray-500" />;
  }
};

export default function ChatsPage() {
  const [activeChats, setActiveChats] = useState<TradeOffer[]>([]);
  const [itemDetailsCache, setItemDetailsCache] = useState<Record<string, Item | null>>({});
  const [userDetailsCache, setUserDetailsCache] = useState<Record<string, User | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser: firebaseUser, isLoading: authIsLoading } = useAuth();

  useEffect(() => {
    const fetchChatData = async () => {
      if (authIsLoading) {
        setIsLoading(true);
        return;
      }

      if (!firebaseUser) {
        setIsLoading(false);
        setActiveChats([]);
        setItemDetailsCache({});
        setUserDetailsCache({});
        return;
      }

      setIsLoading(true);
      try {
        // Use actual authenticated user's ID
        const trades = await getTradesForUser(firebaseUser.uid);
        const filteredTrades = trades.filter(trade =>
            (trade.status === 'pending' || trade.status === 'accepted')
        );
        setActiveChats(filteredTrades);

        const allItems = await getAllItems();
        const allUsers = await getAllUsers();

        const itemsCache: Record<string, Item | null> = {};
        allItems.forEach(item => itemsCache[item.id] = item);
        setItemDetailsCache(itemsCache);

        const usersCache: Record<string, User | null> = {};
        allUsers.forEach(user => usersCache[user.id] = user);
        setUserDetailsCache(usersCache);

      } catch (error) {
        console.error("Error fetching chat data:", error);
        toast({ title: "Error Loading Chats", description: "Could not load your trade chats from Firestore.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, authIsLoading, toast]);

  const getItemName = (itemId: string) => itemDetailsCache[itemId]?.name || 'Unknown Item';

  const getUserName = (userId: string, currentAuthUserId: string | undefined) => {
      if (userId === currentAuthUserId) return "You";
      return userDetailsCache[userId]?.name || `User (${userId.substring(0,4)})`;
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              Loading Your Trade Chats...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">Fetching your conversations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!firebaseUser && !authIsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Your Trade Chats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground font-body">Please <Link href="/auth/signin?redirect=/chats" className="text-primary hover:underline">sign in</Link> to view your trade chats.</p>
          </CardContent>
        </Card>
        {/* Keep the Direct Assistant Chat accessible even if not logged in, or decide to hide it too */}
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-3">
              <Bot className="h-8 w-8 text-accent" />
              Direct Assistant Chat
            </CardTitle>
            <CardDescription className="font-body">
              Have a question or need help? Chat directly with our AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeneralChatWindow />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Your Trade Chats
          </CardTitle>
          <CardDescription className="font-body">
            Access your ongoing and recent trade negotiations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeChats.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-10">You have no active trade chats.</p>
          ) : (
            <div className="space-y-4">
              {activeChats.map((trade) => {
                // Ensure firebaseUser is not null here before accessing uid
                const currentAuthUserId = firebaseUser?.uid;
                if (!currentAuthUserId) return null; // Skip this trade if no authenticated user
                const otherPartyId = trade.offeringUserId === currentAuthUserId ? trade.receivingUserId : trade.offeringUserId;
                const otherPartyName = getUserName(otherPartyId, currentAuthUserId);
                
                let itemCurrentUserOffersName = 'Something';
                let itemOtherUserOffersName = 'Something';

                if (trade.offeringUserId === currentAuthUserId) {
                  itemCurrentUserOffersName = getItemName(trade.offeredItemId);
                  itemOtherUserOffersName = getItemName(trade.requestedItemId);
                } else {
                  itemCurrentUserOffersName = getItemName(trade.requestedItemId);
                  itemOtherUserOffersName = getItemName(trade.offeredItemId);
                }

                return (
                  <Card key={trade.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon status={trade.status} />
                          <h3 className="font-headline text-lg">
                            Chat with {otherPartyName}
                          </h3>
                           <Badge variant={
                                trade.status === 'accepted' ? 'default' :
                                trade.status === 'pending' ? 'secondary' :
                                'outline'
                            } className="capitalize ml-auto sm:ml-2 py-1 px-2 text-xs">
                                {trade.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-body line-clamp-2">
                           {`Your offer: ${itemCurrentUserOffersName} for Their: ${itemOtherUserOffersName}`}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">
                          Last activity: {new Date(trade.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href={`/trades/${trade.id}`}>Open Chat</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Bot className="h-8 w-8 text-accent" />
            Direct Assistant Chat
          </CardTitle>
          <CardDescription className="font-body">
            Have a question or need help? Chat directly with our AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralChatWindow />
        </CardContent>
      </Card>
    </div>
  );
}
