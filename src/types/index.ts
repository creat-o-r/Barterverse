
export type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  dataAiHint?: string; // Added for placeholder image hints
  category: string;
  ownerId: string;
  ownerName: string;
  status: 'available' | 'traded' | 'pending';
  listingType: 'offer' | 'want'; // New field
  isThirdPartyFulfillment?: boolean; // Flag for UI hint
};

export type UserMotivation = 'help-others' | 'maximize-trades' | 'convenience-focused' | 'community-building' | 'unique-finds';
export type TradeTimingPreference = 'simultaneous' | 'staged' | 'flexible';

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string; // Added for placeholder image hints
  rating: number; // Average rating
  tradesCompleted: number;
  bio?: string;
  items: Item[]; // Items listed by the user
  interestedInThirdPartyFulfillment?: boolean; 
  // Experimental LLM-aware preferences
  motivations?: UserMotivation[];
  locationPreference?: {
    isSensitive: boolean;
    notes?: string; // e.g., "Prefers local pickup for large items"
  };
  tradeTimingPreference?: TradeTimingPreference;
};

export type TradeOffer = {
  id:string;
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
