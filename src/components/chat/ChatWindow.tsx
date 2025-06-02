'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import type { Item, ChatMessage } from '@/types';
import { tradeNegotiationChat } from '@/ai/flows/trade-negotiation-chat'; // Adjust path as necessary
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  currentItem: Item; // The item the current user is offering (or context item)
  requestedItemInitial?: Item | null; // Item initially requested, if any
  otherUserId: string;
  otherUserName: string;
  tradeId: string; // To scope chat history if persisted
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
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initial message from AI to set context
  useEffect(() => {
    setMessages([
      {
        id: 'initial-ai-message',
        senderId: 'llm',
        text: `Hi! I'm here to help you negotiate a trade for "${currentItem.name}" with ${otherUserName}. What would you like to propose or discuss? ${requestedItemInitial ? `They have listed "${requestedItemInitial.name}".` : ''}`,
        timestamp: new Date(),
        isAIMessage: true,
      },
    ]);
  }, [currentItem, otherUserName, requestedItemInitial]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
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
      id: Date.now().toString(), // Temporary ID
      senderId: 'user', // Assuming 'user1' is the current user
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(msg => `${msg.senderId === 'llm' ? 'AI' : 'User'}: ${msg.text}`).join('\n');
      
      const aiResponse = await tradeNegotiationChat({
        itemOfferedDescription: `${currentItem.name}: ${currentItem.description}`,
        itemWantedDescription: requestedItemInitial ? `${requestedItemInitial.name}: ${requestedItemInitial.description}` : 'User has not specified an item yet.',
        chatHistory: chatHistory + `\nUser: ${userMessage.text}`, // Append current message to history for AI
        userMessage: userMessage.text,
      });

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai', // Temporary ID
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
      // Optionally add an error message to chat
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
              message.senderId === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.senderId !== 'user' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-[70%] p-3 rounded-lg text-sm font-body',
                message.senderId === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted text-muted-foreground rounded-bl-none'
              )}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              <p className={cn(
                "text-xs mt-1",
                message.senderId === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
                message.senderId === 'user' ? 'text-right' : 'text-left'
              )}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.senderId === 'user' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><User size={18}/></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
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
