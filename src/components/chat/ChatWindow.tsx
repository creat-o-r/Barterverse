
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import type { Item, ChatMessage, User } from '@/types'; // Added User
import { tradeNegotiationChat } from '@/ai/flows/trade-negotiation-chat';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
// import { dummyUsers } from '@/lib/dummy-data'; // Replaced
import { getUser } from '@/lib/firebase/firestoreUtils'; // Firestore access

// Simulated current user ID
const SIMULATED_CURRENT_USER_ID = 'user1';

interface ChatWindowProps {
  currentItem: Item; // Item that forms the primary context from *other user's* side (e.g., what they offer, or what they want of yours)
  requestedItemInitial?: Item | null; // Item that forms primary context from *current user's* side (e.g., what you offer, or what you want of theirs)
  otherUserId: string;
  otherUserName: string;
  tradeId: string; // To scope chat history if persisted AND determine trade initiator
}

export default function ChatWindow({
  currentItem, // From other user's perspective for the negotiation (e.g. their offer, or their want that is your item)
  requestedItemInitial, // From current user's perspective (e.g. your offer, or your want that is their item)
  otherUserId,
  otherUserName,
  tradeId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentUserId = dummyUsers[0].id; // Simulate current user

  // Determine who initiated the trade interest based on tradeId
  // tradeId format: trade-${INITIATOR_ID}-wants-${WANTED_ITEM_ID}-from-${WANTED_ITEM_OWNER_ID}
  const tradeIdParts = tradeId.split('-');
  const initiatorId = tradeIdParts.length > 1 ? tradeIdParts[1] : null;
  const isCurrentUserInitiator = currentUserId === initiatorId;

  useEffect(() => {
    let initialAiText = `Hi! I'm here to help you negotiate with ${otherUserName}. `;
    if (isCurrentUserInitiator) {
      initialAiText += `You're interested in their "${currentItem.name}". What would you like to propose?`;
      if (requestedItemInitial) {
        initialAiText += ` You could offer your "${requestedItemInitial.name}".`;
      }
    } else {
      initialAiText += `${otherUserName} is interested in your "${requestedItemInitial?.name || 'item'}". What are your thoughts?`;
      if (currentItem) {
         initialAiText += ` They might offer their "${currentItem.name}".`;
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
  }, [currentItem, otherUserName, requestedItemInitial, isCurrentUserInitiator]); // Added isCurrentUserInitiator

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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId, // Use actual currentUserId
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

      if (isCurrentUserInitiator) {
        // Current user wants `currentItem` (from other user) and offers `requestedItemInitial` (their own)
        itemOfferedForFlowDesc = requestedItemInitial 
          ? `${requestedItemInitial.name}: ${requestedItemInitial.description}` 
          : "User's offer is being discussed.";
        itemWantedForFlowDesc = `${currentItem.name}: ${currentItem.description}`;
      } else {
        // Other user wants `requestedItemInitial` (current user's item) and offers `currentItem` (their own)
        itemOfferedForFlowDesc = currentItem 
          ? `${currentItem.name}: ${currentItem.description}`
          : "Other user's offer is being discussed.";
        itemWantedForFlowDesc = requestedItemInitial
          ? `${requestedItemInitial.name}: ${requestedItemInitial.description}`
          : "Item wanted is being discussed.";
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
            {message.senderId !== currentUserId && (
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
                 {/* Add user avatar image if available, otherwise fallback to initial */}
                <AvatarFallback>{dummyUsers.find(u=>u.id === currentUserId)?.name.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-end gap-2 mb-4 justify-start typing-indicator">
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
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow mr-2"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()} className="bg-primary hover:bg-primary/90">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
