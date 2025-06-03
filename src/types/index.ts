
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
  minimumMatchRatingOverride?: 'Low' | 'Medium' | 'High';
};

export type UserMotivation = 'help-others' | 'maximize-trades' | 'convenience-focused' | 'community-building' | 'unique-finds';
export type TradeTimingPreference = 'simultaneous' | 'staged' | 'flexible';

export type UserProfileLocationPreference = {
  isSensitive: boolean;
  notes?: string; // e.g., "Prefers local pickup for large items"
};

export type UserProfilePreferences = {
  motivations?: UserMotivation[];
  locationPreference?: UserProfileLocationPreference;
  tradeTimingPreference?: TradeTimingPreference;
  interestedInThirdPartyFulfillment?: boolean;
  minimumMatchRating?: 'Low' | 'Medium' | 'High';
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string; // Added for placeholder image hints
  rating: number; // Average rating
  tradesCompleted: number;
  bio?: string;
  items: Item[]; // Items listed by the user
} & UserProfilePreferences; // Embed preferences directly

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

// Specifically for the inferUserPreferencesFlow output.
// This matches the structure of UserProfilePreferences but ensures all fields are optional
// as returned by the AI before they are applied to a user.
export type InferredUserPreferences = {
  motivations?: UserMotivation[];
  locationPreference?: {
    isSensitive: boolean;
    notes?: string;
  };
  tradeTimingPreference?: TradeTimingPreference;
  interestedInThirdPartyFulfillment?: boolean;
  minimumMatchRating?: 'Low' | 'Medium' | 'High';
};

export type InferUserPreferencesOutput = {
  userId: string;
  suggestedPreferences: InferredUserPreferences;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning?: string;
  errorMessage?: string;
};

