"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, Loader2, ListChecks, Package, Tag, ImageIcon, LogIn } from 'lucide-react';
import Image from 'next/image';
import type { Item, ChatMessage } from '@/types'; // User type not directly needed if appUser from context is used
import { generalChat } from '@/ai/flows/general-chat-flow';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { getItemsByOwner } from '@/lib/firebase/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';

export default function QuickListPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For AI response loading
  const [userListings, setUserListings] = useState<Item[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentUser: firebaseUser, appUser, isLoading: authIsLoading } = useAuth();
  const pathname = usePathname();

  const currentAuthUserId = firebaseUser?.uid;

  useEffect(() => {
    let aiWelcomeText = "Welcome to Quick List! Describe the items you want to list (e.g., 'List a red bike, good condition, for trade' or 'I want to sell three vintage t-shirts').\n\n(Note: Currently, I can chat but can't actually create listings yet. This is a preview of the Quick List feature!)";
    if (!authIsLoading && !firebaseUser) {
        aiWelcomeText = "Please sign in to use the Quick List feature and see your current listings.";
    }
    setMessages([
      { id: 'initial-quicklist-ai-message', senderId: 'llm', text: aiWelcomeText, timestamp: new Date(), isAIMessage: true, }
    ]);

    if (authIsLoading) {
        setIsLoadingListings(true);
        return;
    }
    if (firebaseUser) {
      setIsLoadingListings(true);
      getItemsByOwner(firebaseUser.uid)
        .then(listings => {
          setUserListings(listings.filter(item => item.status === 'available' || item.status === 'pending'));
        })
        .catch(error => {
          console.error("Error fetching user listings for QuickList:", error);
          toast({ title: "Error", description: "Could not load your listings.", variant: "destructive" });
          setUserListings([]);
        })
        .finally(() => setIsLoadingListings(false));
    } else {
      setUserListings([]);
      setIsLoadingListings(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, authIsLoading]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!currentAuthUserId) {
      toast({ title: "Not Logged In", description: "Please sign in to chat.", variant: "destructive"});
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentAuthUserId,
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const chatHistoryForFlow = messages
        .map(msg => `${msg.isAIMessage ? 'AI' : 'User'}: ${msg.text}`)
        .join('\n');
      
      const aiResponse = await generalChat({
        chatHistory: chatHistoryForFlow + `\nUser: ${userMessage.text}`,
        userMessage: userMessage.text,
      });

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai', senderId: 'llm', text: aiResponse.response, timestamp: new Date(), isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error calling general AI chat:', error);
      toast({ title: "Chat Error", description: "Could not get a response from the assistant.", variant: "destructive" });
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-err', senderId: 'llm', text: "Sorry, I couldn't connect. Please try again.", timestamp: new Date(), isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh_-_8rem)]">
      <Card className="flex-grow md:flex-grow-[2] flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" /> Quick List Chat
          </CardTitle>
          <CardDescription className="font-body">
            Chat with the AI to list your items quickly. Describe what you have, and the AI will help (soon!).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex items-end gap-2 mb-4', message.senderId === currentAuthUserId ? 'justify-end' : 'justify-start')}
              >
                {message.senderId !== currentAuthUserId && (
                  <Avatar className="h-8 w-8"><AvatarFallback><Bot size={18}/></AvatarFallback></Avatar>
                )}
                <div className={cn('max-w-[70%] p-3 rounded-lg text-sm font-body', message.senderId === currentAuthUserId ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-muted-foreground rounded-bl-none')}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                   <p className={cn("text-xs mt-1", message.senderId === currentAuthUserId ? 'text-primary-foreground/70' : 'text-muted-foreground/70', message.senderId === currentAuthUserId ? 'text-right' : 'text-left')}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.senderId === currentAuthUserId && appUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={appUser.avatarUrl || firebaseUser?.photoURL || undefined} alt={appUser.name} />
                    <AvatarFallback>{appUser.name?.charAt(0) || firebaseUser?.email?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 mb-4 justify-start">
                <Avatar className="h-8 w-8"><AvatarFallback><Bot size={18}/></AvatarFallback></Avatar>
                <div className="max-w-[70%] p-3 rounded-lg text-sm font-body bg-muted text-muted-foreground rounded-bl-none">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex items-center p-3 border-t bg-background">
            <Input
              type="text"
              placeholder={currentAuthUserId ? "e.g., 'List 3 books...'" : "Sign in to chat with Quick List AI"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow mr-2"
              disabled={isLoading || authIsLoading || !currentAuthUserId}
            />
            <Button type="submit" size="icon" disabled={isLoading || authIsLoading || !currentAuthUserId || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:flex-grow-[1] flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Package className="h-6 w-6 text-accent" />
            {appUser ? `${appUser.name}'s Listings` : "Your Current Listings"}
          </CardTitle>
           <CardDescription className="font-body text-xs">
            Items you are offering or want.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {authIsLoading || isLoadingListings ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !firebaseUser ? (
                 <p className="text-center text-muted-foreground font-body py-10">
                    <Link href={`/auth/signin?redirect=${encodeURIComponent(pathname)}`} className="text-primary hover:underline flex flex-col items-center gap-2">
                        <LogIn className="h-6 w-6"/>
                        Sign in to view your listings.
                    </Link>
                </p>
            ) : userListings.length === 0 ? (
              <p className="text-center text-muted-foreground font-body py-10">You have no active listings.</p>
            ) : (
              <div className="space-y-3">
                {userListings.map(item => (
                  <div key={item.id} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {item.imageUrl && item.imageUrl !== '' ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" data-ai-hint={item.dataAiHint || "item image"} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div className="flex-grow min-w-0">
                             <Link href={`/items/${item.id}`} className="hover:text-primary" title={item.name}>
                                <h4 className="text-sm font-semibold truncate font-headline" title={item.name}>{item.name}</h4>
                             </Link>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Tag className="h-3 w-3 shrink-0" /> {item.category}
                            </p>
                            <Badge
                                variant={item.listingType === 'offer' ? (item.isGiftItForward ? 'default' : 'secondary') : 'outline'}
                                className={`text-[10px] mt-1 capitalize px-1.5 py-0.5 ${item.listingType === 'offer' && item.isGiftItForward ? 'bg-pink-500 text-white' : ''}`}
                            >
                                {item.listingType}
                            </Badge>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
