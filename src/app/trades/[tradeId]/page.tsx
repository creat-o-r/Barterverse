
'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import type { TradeChat, ChatMessage as ChatMessageType, Item as ItemType, UserProfileDocument } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageSquare, Send, ArrowLeft, Info, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


export default function TradeChatPage() {
  const params = useParams();
  const tradeId = params.tradeId as string;
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tradeChat, setTradeChat] = useState<TradeChat | null>(null);
  const [involvedItems, setInvolvedItems] = useState<ItemType[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false); // For suggestion loading state
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch TradeChat details and listen for messages
  useEffect(() => {
    if (!tradeId || !authUser) {
      if (!authLoading && !authUser) router.replace('/auth/signin');
      return;
    }

    setIsLoading(true);
    const chatDocRef = doc(db, 'tradeChats', tradeId);

    // Fetch chat details once
    getDoc(chatDocRef).then(async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as TradeChat;
        // Convert Timestamps
        chatData.createdAt = (chatData.createdAt as unknown as Timestamp)?.toDate() || new Date();
        chatData.updatedAt = (chatData.updatedAt as unknown as Timestamp)?.toDate() || new Date();
        if (chatData.lastMessageTimestamp) {
          chatData.lastMessageTimestamp = (chatData.lastMessageTimestamp as unknown as Timestamp)?.toDate();
        }
        setTradeChat(chatData);

        // Fetch details for involved items
        if (chatData.itemIds && chatData.itemIds.length > 0) {
          const itemPromises = chatData.itemIds.map(itemId => getDoc(doc(db, 'items', itemId)));
          const itemDocs = await Promise.all(itemPromises);
          const itemsData = itemDocs.filter(snap => snap.exists()).map(snap => ({id: snap.id, ...snap.data()} as ItemType));
          setInvolvedItems(itemsData);
        }

      } else {
        toast({ title: "Error", description: "Chat not found.", variant: "destructive" });
        router.push('/chats');
      }
    }).catch(error => {
      console.error("Error fetching chat details:", error);
      toast({ title: "Error", description: "Could not load chat details.", variant: "destructive" });
    });

    // Listen for messages
    const messagesQuery = query(collection(db, 'tradeChats', tradeId, 'chatMessages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const fetchedMessages: ChatMessageType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          ...data,
          id: doc.id,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        } as ChatMessageType);
      });
      setMessages(fetchedMessages);
      setIsLoading(false); // Stop loading after initial messages load
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [tradeId, authUser, router, toast, authLoading]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !authUser || !tradeChat) return;

    setIsSending(true);
    const messageData: Omit<ChatMessageType, 'id'> = {
      chatId: tradeId,
      senderId: authUser.uid,
      text: newMessageText.trim(),
      timestamp: serverTimestamp() as Timestamp, // Firestore will convert this
      isLLM: false,
    };

    try {
      // Add message to subcollection
      const messagesColRef = collection(db, 'tradeChats', tradeId, 'chatMessages');
      await addDoc(messagesColRef, messageData);

      // Update parent TradeChat document
      const chatDocRef = doc(db, 'tradeChats', tradeId);
      await updateDoc(chatDocRef, {
        lastMessageText: newMessageText.trim(),
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Optional: Increment unread count for other participant(s)
        // [`unreadCount.${otherParticipantId}`]: increment(1)
      });

      setNewMessageText(''); // Clear input field

      // Placeholder for LLM response trigger
      // console.log("LLM response would be triggered here for message:", newMessageText.trim());
      // if (shouldTriggerLLM(newMessageText.trim())) {
      //   await triggerLLMAssistant(tradeId, newMessageText.trim(), authUser.uid);
      // }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleGetSuggestion = async () => {
    if (!authUser || !tradeChat || involvedItems.length === 0) {
      toast({ title: "Error", description: "Not enough information to get a suggestion.", variant: "destructive" });
      return;
    }
    setIsSuggesting(true);

    // Determine requesterItem and counterpartyItem.
    // This logic assumes the first item in tradeChat.itemIds is the primary item of interest (counterparty's).
    // And that the requester is the authUser.
    // A more robust solution might involve explicit selection or context.
    const primaryItemId = tradeChat.itemIds[0];
    const counterpartyItemDetails = involvedItems.find(item => item.id === primaryItemId);

    // For requesterItem, we don't have an explicit "offered item" in this simplified chat context yet.
    // So, we might pass it as undefined or try to find one from authUser's items if fetched.
    // For now, we'll pass undefined for requesterItem, or a placeholder if the schema requires it.
    // The LLM prompt will need to handle cases where one side hasn't explicitly offered.

    // Simplified: Assume counterpartyItem is the first item in involvedItems (if any)
    // and its owner is the other participant. Requester's item is not explicitly defined here.
    const counterparty = tradeChat.participantInfo.find(p => p.userId !== authUser.uid);
    let identifiedCounterpartyItem: ItemType | undefined;
    let identifiedRequesterItem: ItemType | undefined; // This would ideally be an item the authUser is offering

    if (counterparty && involvedItems.length > 0) {
      // Find an item owned by the counterparty from involvedItems
      identifiedCounterpartyItem = involvedItems.find(item => item.ownerId === counterparty.userId && tradeChat.itemIds.includes(item.id));
      // Find an item owned by the authUser from involvedItems (if any were added to tradeChat.itemIds)
      identifiedRequesterItem = involvedItems.find(item => item.ownerId === authUser.uid && tradeChat.itemIds.includes(item.id));
    }
     // Fallback if only one item is in involvedItems, assume it's the counterparty's
    if (!identifiedCounterpartyItem && involvedItems.length === 1) {
      identifiedCounterpartyItem = involvedItems[0];
    }


    const input = {
      userId: authUser.uid,
      chatId: tradeId,
      // Pass simplified item details
      requesterItem: identifiedRequesterItem ? { id: identifiedRequesterItem.id, title: identifiedRequesterItem.title, description: identifiedRequesterItem.description, category: identifiedRequesterItem.category } : undefined,
      counterpartyItem: identifiedCounterpartyItem ? { id: identifiedCounterpartyItem.id, title: identifiedCounterpartyItem.title, description: identifiedCounterpartyItem.description, category: identifiedCounterpartyItem.category } : undefined,
      chatHistory: messages.slice(-5).map(m => `${m.senderId === authUser.uid ? 'You' : (tradeChat.participantInfo.find(p=>p.userId === m.senderId)?.displayName || 'Partner')}: ${m.text}`).join('\n'),
      userPreferences: "Interested in a fair trade.", // Placeholder
    };

    try {
      const response = await fetch('/api/suggest-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const suggestionOutput = await response.json();

      if (suggestionOutput.suggestionText) {
        const aiMessageData: Omit<ChatMessageType, 'id'> = {
          chatId: tradeId,
          senderId: 'LLM-System', // Special sender ID for AI suggestions
          text: suggestionOutput.suggestionText,
          timestamp: serverTimestamp() as Timestamp,
          isLLM: true,
        };
        const messagesColRef = collection(db, 'tradeChats', tradeId, 'chatMessages');
        await addDoc(messagesColRef, aiMessageData);
        // Optionally update TradeChat's last message for AI suggestions too
         await updateDoc(doc(db, 'tradeChats', tradeId), {
            lastMessageText: `Trade Assistant: ${suggestionOutput.suggestionText.substring(0,50)}...`,
            lastMessageTimestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
      }
      if(suggestionOutput.suggestedTrades && suggestionOutput.suggestedTrades.length > 0){
        // TODO: Handle structured suggestions if needed (e.g. display them in a special card)
        console.log("Structured suggestions received:", suggestionOutput.suggestedTrades);
      }

    } catch (error: any) {
      console.error("Error getting suggestion:", error);
      toast({ title: "Suggestion Error", description: error.message || "Could not get suggestion.", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const getOtherParticipant = () => {
    if (!tradeChat || !authUser) return null;
    return tradeChat.participantInfo.find(p => p.userId !== authUser.uid);
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading chat...</div>;
  }

  if (!tradeChat) {
    return <div className="text-center py-10">Chat not found or access denied.</div>;
  }
  
  const otherParticipant = getOtherParticipant();

  return (
    <div className="container mx-auto max-w-3xl py-6">
      <Card className="h-[calc(100vh-10rem)] flex flex-col">
        <CardHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParticipant?.photoURL || undefined} />
              <AvatarFallback>{(otherParticipant?.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{otherParticipant?.displayName || 'Trade Partner'}</CardTitle>
              {involvedItems.length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package size={14}/> Discussing: {involvedItems.map(item => item.title).join(', ')}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === authUser?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                  msg.senderId === authUser?.uid
                    ? 'bg-primary text-primary-foreground'
                    : (msg.isLLM ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'bg-muted')
                }`}
              >
                {msg.isLLM && <p className="text-xs font-semibold mb-1">Trade Assistant Suggestion:</p>}
                <p className="text-sm">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.senderId === authUser?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                  {format(msg.timestamp, 'p, MMM d')}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="p-4 border-t flex flex-col gap-2">
          <Button onClick={handleGetSuggestion} variant="outline" size="sm" className="w-full mb-2" disabled={isSuggesting || isSending}>
            {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
            Get AI Suggestion
          </Button>
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1"
              disabled={isSending || isSuggesting}
            />
            <Button type="submit" disabled={isSending || isSuggesting || !newMessageText.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-2 sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
