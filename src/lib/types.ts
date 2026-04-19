export interface AgentProfile {
  handle?: string | null;
  brand_color?: string | null;
  id: string;
  name: string;
  title: string;
  brokerage: string;
  phone: string;
  email: string;
  headshot_url: string | null;
  instagram: string;
  linkedin: string;
  zillow: string;
  realtor_com: string;
  facebook: string;
  website: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  trial_ends_at: string;
  setup_fee_paid: boolean;
  weekly_emails: boolean;
  calendly_url: string;
  ai_approval_mode: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  google_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  src: string;
  alt: string;
}

export interface PriceHistoryEntry {
  date: string; // ISO string
  price: number;
  event: "listed" | "reduced" | "increased" | "pending" | "sold" | "relisted";
}

export interface Listing {
  id: string;
  agent_id: string;
  status: "draft" | "published" | "pending" | "closed" | "archived" | "coming_soon";
  launch_date?: string | null;
  video_intro_url?: string | null;
  brand_color?: string | null;
  slug: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number | null;
  lot_size: string;
  description: string;
  features: string[];
  photos: ListingPhoto[];
  videos: ListingVideo[];
  virtual_tour_url: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  // MLS-parity fields (all optional)
  price_history?: PriceHistoryEntry[];
  mls_id?: string | null;
  county?: string | null;
  subdivision?: string | null;
  architectural_style?: string | null;
  property_subtype?: string | null;
  stories?: number | null;
  parking_spaces?: number | null;
  property_tax_annual?: number | null;
  hoa_required?: boolean;
  hoa_fee_monthly?: number | null;
  heating_type?: string | null;
  cooling_type?: string | null;
  water_source?: string | null;
  sewer_type?: string | null;
  roof_type?: string | null;
  construction_material?: string | null;
  foundation_type?: string | null;
  appliances_included?: string[];
  school_elementary?: string | null;
  school_middle?: string | null;
  school_high?: string | null;
  parcel_number?: string | null;
  fireplace_count?: number | null;
  laundry_location?: string | null;
  basement_type?: string | null;
  published_at?: string | null;
  // Per-listing AI chat toggle. True by default — set to false to hide
  // the AI chat bubble on that specific listing.
  ai_chat_enabled?: boolean;
}

export interface ListingVideo {
  src: string;
  thumbnail?: string;
  alt: string;
}

export interface Lead {
  id: string;
  listing_id: string;
  agent_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  status: "new" | "contacted" | "showing_scheduled" | "offer_made" | "under_contract" | "closed" | "lost";
  auto_reply_draft: string | null;
  first_response_at: string | null;
  hot_score: number;
  notes: string;
  tags: string[];
  closed_price: number | null;
  commission_amount: number | null;
  closed_at: string | null;
  pre_approved: "yes" | "working_on_it" | "no" | "cash" | "not_specified" | null;
  timeline: "asap" | "30_90" | "3_6_months" | "just_looking" | "not_specified" | null;
  has_agent: "yes" | "no" | "not_specified" | null;
  source: string | null;
  created_at: string;
  // joined fields
  listing?: Pick<Listing, "street" | "city" | "state">;
}

export interface ShowingFeedback {
  id: string;
  showing_id: string;
  agent_id: string;
  lead_id: string | null;
  rating: number | null;
  notes: string;
  interest_level: "very_interested" | "maybe" | "not_interested" | null;
  token: string;
  request_sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Testimonial {
  id: string;
  agent_id: string;
  lead_id: string | null;
  author_name: string;
  rating: number | null;
  quote: string;
  approved: boolean;
  featured: boolean;
  token: string;
  request_sent_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Showing {
  id: string;
  lead_id: string;
  listing_id: string;
  agent_id: string;
  showing_date: string;
  showing_time: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "confirmed" | "completed" | "canceled" | "no_show";
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  listing?: Pick<Listing, "street" | "city" | "state">;
  lead?: Pick<Lead, "name" | "email" | "phone">;
}

export interface Message {
  id: string;
  lead_id: string;
  agent_id: string;
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  provider_message_id: string | null;
  in_reply_to: string | null;
  attachments: Array<{ filename: string; url?: string }>;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  agent_id: string;
  listing_id: string;
  day_number: number;
  sequence_type: "inquiry" | "showing";
  subject: string;
  body: string;
  status: "pending" | "sent" | "skipped" | "failed";
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export type SellerProspectSource =
  | "referral"
  | "door_knock"
  | "expired_listing"
  | "farming"
  | "open_house"
  | "past_client"
  | "online"
  | "other";

export type SellerProspectStage =
  | "prospect"
  | "met"
  | "presentation"
  | "listed"
  | "sold"
  | "dropped";

export interface SellerProspect {
  id: string;
  agent_id: string;
  name: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  source: SellerProspectSource;
  stage: SellerProspectStage;
  estimated_value: number | null;
  notes: string | null;
  follow_up_date: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}
