
export type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  dataAiHint?: string;
  category: string;
  ownerId: string;
  ownerName: string;
  status: 'available' | 'traded' | 'pending';
  listingType: 'offer' | 'want';
  isThirdPartyFulfillment?: boolean;
  minimumMatchRatingOverride?: 'Low' | 'Medium' | 'High';
  isGiftItForward?: boolean;
  logistics?: ItemLogistics;
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
  name: string;
  address?: string;
  isDefault?: boolean;
};

export type UserLogisticsPreferences = {
  defaultShippingOption: ItemLogisticsShippingOption;
  // defaultMeetupOption: ItemLogisticsMeetupOption; // Removed
  preferredStoredLocationId?: string;
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
  locations?: UserStoredLocation[];
  logisticsPreferences?: UserLogisticsPreferences;
} & UserProfilePreferences;

export type ItemLogisticsLocationType = 'profile_stored_location' | 'item_specific_location';
export type ItemLogisticsShippingOption = 'pickup_only' | 'ship_domestic' | 'ship_international' | 'delivery_area' | 'possible_delivery';
// export type ItemLogisticsMeetupOption = 'public_meetup' | 'flexible'; // Removed

export type ItemLogistics = {
  locationType: ItemLogisticsLocationType;
  selectedUserStoredLocationId?: string;
  itemSpecificAddress?: string;
  shippingOption: ItemLogisticsShippingOption;
  // meetupOption: ItemLogisticsMeetupOption; // Removed
  notes?: string;
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
