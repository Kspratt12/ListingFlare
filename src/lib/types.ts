export interface AgentProfile {
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
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  src: string;
  alt: string;
}

export interface Listing {
  id: string;
  agent_id: string;
  status: "draft" | "published" | "pending" | "closed" | "archived";
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
  created_at: string;
  // joined fields
  listing?: Pick<Listing, "street" | "city" | "state">;
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
