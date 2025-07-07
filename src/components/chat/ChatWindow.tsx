"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, Loader2 } from 'lucide-react'; // Removed User icon as it's part of Avatar
import type { Item, ChatMessage } from '@/types'; // User type not needed directly here if appUser from context has enough
import { tradeNegotiationChat } from '@/ai/flows/trade-negotiation-chat';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface ChatWindowProps {
  currentItem: Item;
  requestedItemInitial?: Item | null;
  otherUserId: string;
  otherUserName: string;
  tradeId: string;
}

export default function ChatWindow({
  currentItem,
  requestedItemInitial,
  otherUserId,
  otherUserName,
  tradeId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For AI response loading
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentUser: firebaseUser, appUser, isLoading: authIsLoading } = useAuth();

  const currentUserId = firebaseUser?.uid; // Use authenticated user's ID

  const tradeIdParts = tradeId.split('-');
  const initiatorId = tradeIdParts.length > 1 ? tradeIdParts[1] : null;
  // isCurrentUserInitiator depends on currentUserId which might be null initially
  const isCurrentUserInitiator = currentUserId && currentUserId === initiatorId;

  useEffect(() => {
    // Wait for auth to resolve before setting initial message
    if (authIsLoading) return;

    let initialAiText = `Hi! I'm here to help you negotiate with ${otherUserName}. `;
    if (!currentUserId) {
      initialAiText = "Please sign in to participate in this chat.";
    } else if (isCurrentUserInitiator) {
      initialAiText += `You're interested in their "${currentItem.name}". What would you like to propose?`;
      if (requestedItemInitial) {
        initialAiText += ` You could offer your "${requestedItemInitial.name}".`;
      }
    } else { // Current user is not the initiator (or currentUserId is null, handled above)
      initialAiText += `${otherUserName} is interested in your "${requestedItemInitial?.name || currentItem.name}". What are your thoughts?`;
      if (currentItem && otherUserId === currentItem.ownerId) { // Ensure currentItem is indeed the other user's offer
         initialAiText += ` They might offer their "${currentItem.name}".`;
      } else if (requestedItemInitial && otherUserId === requestedItemInitial.ownerId) {
         // This case is less likely given prop names, but as a fallback
         initialAiText += ` They might offer their "${requestedItemInitial.name}".`;
      }
    }

    setMessages([
      {
        id: 'initial-ai-message',
        senderId: 'llm',
        text: initialAiText,
        timestamp: new Date(),
        isAIMessage: true,
      },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem.name, otherUserName, requestedItemInitial?.name, currentUserId, authIsLoading]); // isCurrentUserInitiator will change with currentUserId


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
    if (!currentUserId) {
      toast({ title: "Error", description: "You must be logged in to send messages.", variant: "destructive"});
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId,
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(msg => `${msg.senderId === 'llm' ? 'AI' : (msg.senderId === currentUserId ? 'User' : 'OtherUser')}: ${msg.text}`).join('\n');
      
      let itemOfferedForFlowDesc = "Not specified";
      let itemWantedForFlowDesc = "Not specified";

      // This logic needs to be robust based on who owns `currentItem` and `requestedItemInitial`
      // Assuming `currentItem` is what the other user has that *this* user is interested in,
      // OR what *this* user has that the other user is interested in (if this user is not initiator).
      // And `requestedItemInitial` is what *this* user might offer.

      if (isCurrentUserInitiator) {
        // Current user (initiator) wants `currentItem` (from other user).
        // `requestedItemInitial` is what current user might offer.
        itemWantedForFlowDesc = `${currentItem.name}: ${currentItem.description}`;
        itemOfferedForFlowDesc = requestedItemInitial 
          ? `${requestedItemInitial.name}: ${requestedItemInitial.description}` 
          : "User's specific offer is being discussed.";
      } else {
        // Other user (initiator) wants `requestedItemInitial` (current user's item).
        // `currentItem` is what other user might offer.
        itemWantedForFlowDesc = requestedItemInitial
          ? `${requestedItemInitial.name}: ${requestedItemInitial.description}`
          : "The item they want from you is being discussed.";
        itemOfferedForFlowDesc = currentItem
          ? `${currentItem.name}: ${currentItem.description}`
          : "Their specific offer is being discussed.";
      }
      
      const aiResponse = await tradeNegotiationChat({
        itemOfferedDescription: itemOfferedForFlowDesc,
        itemWantedDescription: itemWantedForFlowDesc,
        chatHistory: chatHistory + `\nUser (${currentUserId}): ${userMessage.text}`,
        userMessage: userMessage.text,
      });

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        senderId: 'llm',
        text: aiResponse.response,
        timestamp: new Date(),
        isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error calling AI chat:', error);
      toast({
        title: "Chat Error",
        description: "Could not get a response from the negotiation assistant. Please try again.",
        variant: "destructive",
      });
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-err',
        senderId: 'llm',
        text: "Sorry, I encountered an error. Please try sending your message again.",
        timestamp: new Date(),
        isAIMessage: true,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-card">
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex items-end gap-2 mb-4',
              message.senderId === currentUserId ? 'justify-end' : 'justify-start'
            )}
          >
            {message.senderId !== currentUserId && ( // AI or other user (if expanded for group chat)
              <Avatar className="h-8 w-8">
                <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-[70%] p-3 rounded-lg text-sm font-body',
                message.senderId === currentUserId
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted text-muted-foreground rounded-bl-none'
              )}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              <p className={cn(
                "text-xs mt-1",
                message.senderId === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
                message.senderId === currentUserId ? 'text-right' : 'text-left'
              )}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.senderId === currentUserId && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={appUser?.avatarUrl || firebaseUser?.photoURL || undefined} alt={appUser?.name || firebaseUser?.displayName || "User"} />
                <AvatarFallback>{appUser?.name?.charAt(0) || firebaseUser?.displayName?.charAt(0) || firebaseUser?.email?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && ( // AI response loading
           <div className="flex items-end gap-2 mb-4 justify-start">
             <Avatar className="h-8 w-8">
                <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
             <div className="max-w-[70%] p-3 rounded-lg text-sm font-body bg-muted text-muted-foreground rounded-bl-none">
                <Loader2 className="h-5 w-5 animate-spin" />
             </div>
           </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex items-center p-3 border-t">
        <Input
          type="text"
          placeholder={currentUserId ? "Type your message..." : "Sign in to chat"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow mr-2"
          disabled={isLoading || authIsLoading || !currentUserId}
        />
        <Button type="submit" size="icon" disabled={isLoading || authIsLoading || !currentUserId || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
