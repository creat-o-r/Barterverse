
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
  listingType: 'offer' | 'want';
  isThirdPartyFulfillment?: boolean;
  minimumMatchRatingOverride?: 'Low' | 'Medium' | 'High';
  isGiftItForward?: boolean;
  logistics?: ItemLogistics; // New field
};

export type UserMotivation = 'help-others' | 'maximize-trades' | 'convenience-focused' | 'community-building' | 'unique-finds';
export type TradeTimingPreference = 'simultaneous' | 'staged' | 'flexible';

export type UserProfileLocationPreference = {
  isSensitive: boolean;
  notes?: string;
};

export type UserProfilePreferences = {
  motivations?: UserMotivation[];
  locationPreference?: UserProfileLocationPreference;
  tradeTimingPreference?: TradeTimingPreference;
  interestedInThirdPartyFulfillment?: boolean;
  minimumMatchRating: 'Low' | 'Medium' | 'High';
};

export type UserStoredLocation = {
  id: string;
  name: string; // e.g., "Home", "Office"
  address?: string; // Simple address string for now
  isDefault?: boolean;
};

export type UserLogisticsPreferences = {
  defaultShippingOption: 'pickup_only' | 'ship_domestic' | 'ship_international';
  defaultMeetupOption: 'public_meetup' | 'flexible';
  preferredStoredLocationId?: string; // ID of a UserStoredLocation to use as default
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string;
  rating: number;
  tradesCompleted: number;
  bio?: string;
  items: Item[];
  locations?: UserStoredLocation[]; // New field
  logisticsPreferences?: UserLogisticsPreferences; // New field
} & UserProfilePreferences;

export type ItemLogisticsLocationType = 'profile_default_location' | 'profile_stored_location' | 'item_specific_location';
export type ItemLogisticsShippingOption = 'profile_default_shipping' | 'pickup_only' | 'ship_domestic' | 'ship_international';
export type ItemLogisticsMeetupOption = 'profile_default_meetup' | 'public_meetup' | 'flexible';

export type ItemLogistics = {
  locationType: ItemLogisticsLocationType;
  selectedUserStoredLocationId?: string; // if locationType is 'profile_stored_location'
  itemSpecificAddress?: string; // if locationType is 'item_specific_location'
  shippingOption: ItemLogisticsShippingOption;
  meetupOption: ItemLogisticsMeetupOption;
  notes?: string; // Optional notes for logistics
};

export type TradeOffer = {
  id:string;
  offeringUserId: string;
  receivingUserId: string;
  offeredItemId: string;
  requestedItemId: string;
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
  senderId: string;
  text: string;
  timestamp: Date;
  isAIMessage?: boolean;
};

export type InferredUserPreferences = {
  motivations?: UserMotivation[];
  locationPreference?: {
    isSensitive: boolean;
    notes?: string;
  };
  tradeTimingPreference?: TradeTimingPreference;
  interestedInThirdPartyFulfillment?: boolean;
  minimumMatchRating: 'Low' | 'Medium' | 'High';
};

export type InferUserPreferencesOutput = {
  userId: string;
  suggestedPreferences: InferredUserPreferences;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning?: string;
  errorMessage?: string;
};
