
export type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  ownerId: string;
  ownerName: string; 
  status: 'available' | 'traded' | 'pending';
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number; // Average rating
  tradesCompleted: number;
  bio?: string;
  items: Item[]; // Items listed by the user
};

export type TradeOffer = {
  id: string;
  offeringUserId: string;
  receivingUserId: string;
  offeredItemId: string;
  requestedItemId: string; // Can be one specific item or a general request
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
};

export type Rating = {
  id: string;
  raterId: string;
  ratedUserId: string;
  tradeId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  senderId: string; // 'user' or 'llm' or actual userId
  text: string;
  timestamp: Date;
  isAIMessage?: boolean;
};
