
export type Item = {
  id: string;
  title: string; // Renamed from name
  description: string;
  imageUrl: string;
  dataAiHint?: string;
  category: string;
  ownerId: string; // User ID of the owner
  ownerName: string; // Denormalized owner's name
  status: 'available' | 'traded' | 'pending';
  listingType: 'offer' | 'want';
  createdAt: Date; // Added createdAt field
  isThirdPartyFulfillment?: boolean;
  // minimumMatchRatingOverride?: 'Low' | 'Medium' | 'High'; // Removed
  isGiftItForward?: boolean;
  openToAnyOpportunity?: boolean;
  logistics?: ItemLogistics;
};

// Represents the data structure for a user's document in the Firestore "users" collection
export type UserProfileDocument = {
  uid: string; // Corresponds to Firebase Auth UID and document ID
  email: string; // User's email, from Firebase Auth
  displayName: string; // User's display name
  photoURL?: string; // URL for profile picture
  bio?: string; // Short user biography
  displayLocation?: string; // Simple text location (e.g., "City, State")
  createdAt: Date; // Timestamp of profile creation
  // Include other structured data if it's directly part of the user document:
  // locations?: UserStoredLocation[];
  // logisticsPreferences?: UserLogisticsPreferences;
  // motivations?: UserMotivation[];
  // tradeTimingPreference?: TradeTimingPreference;
  // minimumMatchRating?: 'Low' | 'Medium' | 'High';
  // rating?: number; // Could be calculated or stored here
  // tradesCompleted?: number; // Could be calculated or stored here
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

// This User type can be used for client-side operations, potentially merging UserProfileDocument
// with other resolved data or client-side state.
// For now, let's make it closely mirror UserProfileDocument for clarity with an eye on extension.
export type User = {
  uid: string; // Firebase Auth UID
  email: string | null; // Email from Firebase Auth (can be null)
  displayName: string | null; // Display name from Firebase Auth or profile
  photoURL?: string | null; // Profile picture URL
  bio?: string;
  displayLocation?: string; // Simple text location
  createdAt?: Date; // Timestamp of profile creation in Firestore

  // Fields from existing User type that might be populated from UserProfileDocument or elsewhere
  dataAiHint?: string;
  rating?: number; // This might be calculated or come from a separate subcollection/service
  tradesCompleted?: number; // Similarly, might be calculated

  // These are more complex and might be part of UserProfileDocument or fetched separately
  items?: Item[]; // Typically fetched on demand, not part of the user doc
  locations?: UserStoredLocation[]; // From UserProfileDocument or separate subcollection
  logisticsPreferences?: UserLogisticsPreferences; // From UserProfileDocument or separate subcollection
  motivations?: UserMotivation[]; // From UserProfileDocument or separate subcollection
  locationPreference?: UserProfileLocationPreference; // From UserProfileDocument or separate subcollection
  tradeTimingPreference?: TradeTimingPreference; // From UserProfileDocument or separate subcollection
  interestedInThirdPartyFulfillment?: boolean; // From UserProfileDocument or separate subcollection
  minimumMatchRating?: 'Low' | 'Medium' | 'High'; // From UserProfileDocument or separate subcollection
};
// Note: The original User type was a mix of UserProfilePreferences.
// This simplified User type focuses on core profile + auth info.
// UserProfilePreferences can be a separate type to be combined if needed.


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

// Information about each participant in a chat, useful for chat list display
export type TradeChatParticipantInfo = {
  userId: string;
  displayName: string;
  photoURL?: string;
};

// Represents a trade negotiation chat session
export type TradeChat = {
  id: string; // Firestore document ID
  itemIds: string[]; // IDs of items involved in the negotiation
  participantIds: string[]; // UIDs of the two users in the chat
  participantInfo: TradeChatParticipantInfo[]; // Denormalized info for easier display
  createdAt: Date; // Timestamp of chat creation
  updatedAt: Date; // Timestamp of last message or significant update
  lastMessageText?: string; // Snippet of the last message for previews
  lastMessageTimestamp?: Date; // Timestamp of the last message for sorting
  // Optional: could add unread message counts per user here if needed
  // unreadCount?: { [userId: string]: number };
};

export type ChatMessage = {
  id: string; // Firestore document ID
  chatId: string; // ID of the TradeChat this message belongs to
  senderId: string; // UID of the user who sent the message, or 'llm-agent'
  text: string;
  timestamp: Date; // Timestamp of when the message was sent
  isLLM?: boolean; // True if the message is from an LLM agent
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
