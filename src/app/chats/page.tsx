
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { TradeChat, Item as ItemType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Package, Loader2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export default function ChatsListPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<TradeChat[]>([]);
  const [involvedItemsDetails, setInvolvedItemsDetails] = useState<Record<string, ItemType>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setIsLoading(false);
      // Optionally redirect to login or show message
      return;
    }

    setIsLoading(true);
    const chatsQuery = query(
      collection(db, 'tradeChats'),
      where('participantIds', 'array-contains', authUser.uid),
      orderBy('updatedAt', 'desc') // Or lastMessageTimestamp
    );

    getDocs(chatsQuery)
      .then(async (querySnapshot) => {
        const fetchedChats: TradeChat[] = [];
        const itemIdsToFetch = new Set<string>();

        querySnapshot.forEach((doc) => {
          const chatData = { id: doc.id, ...doc.data() } as TradeChat;
          // Convert Timestamps
          chatData.createdAt = (chatData.createdAt as unknown as Timestamp)?.toDate() || new Date();
          chatData.updatedAt = (chatData.updatedAt as unknown as Timestamp)?.toDate() || new Date();
          if (chatData.lastMessageTimestamp) {
            chatData.lastMessageTimestamp = (chatData.lastMessageTimestamp as unknown as Timestamp)?.toDate();
          }
          fetchedChats.push(chatData);
          chatData.itemIds.forEach(id => itemIdsToFetch.add(id));
        });
        setChats(fetchedChats);

        // Fetch details for all unique involved items
        if (itemIdsToFetch.size > 0) {
          const itemPromises = Array.from(itemIdsToFetch).map(itemId => getDoc(doc(db, 'items', itemId)));
          const itemDocs = await Promise.all(itemPromises);
          const itemsMap: Record<string, ItemType> = {};
          itemDocs.forEach(snap => {
            if (snap.exists()) {
              itemsMap[snap.id] = {id: snap.id, ...snap.data()} as ItemType;
            }
          });
          setInvolvedItemsDetails(itemsMap);
        }
      })
      .catch((error) => {
        console.error("Error fetching chats:", error);
        // Handle error (e.g., show toast)
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authUser, authLoading]);

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading chats...</div>;
  }

  if (!authUser) {
    return <div className="text-center py-10">Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to view your chats.</div>;
  }

  if (chats.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-8 text-center">
        <MessageSquare className="h-24 w-24 text-muted-foreground mx-auto" />
        <h1 className="text-3xl font-headline">No Chats Yet</h1>
        <p className="text-muted-foreground font-body">
          Start a negotiation on an item page to see your chats here.
        </p>
        <Button asChild>
          <Link href="/items">Browse Items</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      <CardHeader className="px-0">
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Your Trade Chats
        </CardTitle>
        <CardDescription className="font-body">
          Access your ongoing and recent trade negotiations.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4">
        {chats.map((chat) => {
          const otherParticipantInfo = chat.participantInfo.find(p => p.userId !== authUser.uid);
          const itemTitles = chat.itemIds.map(id => involvedItemsDetails[id]?.title || 'Item').join(', ');

          return (
            <Link key={chat.id} href={`/trades/${chat.id}`} className="block">
              <Card className="hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer">
                <CardContent className="p-4 flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipantInfo?.photoURL || undefined} alt={otherParticipantInfo?.displayName} />
                    <AvatarFallback>{(otherParticipantInfo?.displayName || 'P').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-md truncate">
                        {otherParticipantInfo?.displayName || 'Trade Partner'}
                        </h3>
                        {chat.lastMessageTimestamp && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNowStrict(chat.lastMessageTimestamp, { addSuffix: true })}
                        </p>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                      <Package size={14} className="shrink-0"/>
                      <span className="truncate">Item(s): {itemTitles || 'N/A'}</span>
                    </p>
                    <p className="text-sm text-foreground truncate mt-0.5">
                      {chat.lastMessageText || 'No messages yet.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
