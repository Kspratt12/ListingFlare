export interface AgentProfile {
  id: string;
  name: string;
  title: string;
  brokerage: string;
  phone: string;
  email: string;
  headshot_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  trial_ends_at: string;
  setup_fee_paid: boolean;
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
  status: "draft" | "published" | "archived";
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
  view_count: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  // joined fields
  listing?: Pick<Listing, "street" | "city" | "state">;
}
