
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
  isGiftItForward?: boolean;
  openToAnyOpportunity?: boolean;
  logistics?: ItemLogistics;
  specifications?: Record<string, string>; // Added specifications field
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
  minimumMatchRating: 'Low' | 'Medium' | 'High'; // User's global preference, remains
};

export type UserStoredLocation = {
  id: string;
  name: string;
  address?: string;
  isDefault?: boolean;
};

export type ItemDeliveryMethod =
  | 'pickup_only'
  | 'willing_to_ship'
  | 'delivery_area'
  | 'possible_delivery'
  | 'public_meetup'
  | 'flexible_meetup';

export type UserLogisticsPreferences = {
  defaultDeliveryMethods: ItemDeliveryMethod[];
  preferredStoredLocationId?: string;
  openToChainDelivery?: boolean;
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

export type ItemLogisticsLocationType = 'profile_stored_location' | 'item_specific_location' | 'not_specified';

export type ItemTimingType = 'flexible' | 'fixed_date';
export type ItemTiming = {
  type: ItemTimingType;
  date?: string; // ISO date string if type is 'fixed_date'
};

export type ItemLogistics = {
  locationType: ItemLogisticsLocationType;
  selectedUserStoredLocationId?: string; // Only if locationType is 'profile_stored_location'
  itemSpecificAddress?: string;         // Only if locationType is 'item_specific_location'
  deliveryMethods: ItemDeliveryMethod[];
  timing?: ItemTiming; // Added single timing preference
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
