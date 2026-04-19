import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Known good Unsplash real estate stock photos
const DEMO_PHOTOS = [
  {
    src: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80",
    alt: "Stunning modern exterior with custom stonework and manicured landscaping",
  },
  {
    src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
    alt: "Chef's kitchen with quartz counters and stainless steel appliances",
  },
  {
    src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80",
    alt: "Open-concept living room with soaring ceilings and natural light",
  },
  {
    src: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1600&q=80",
    alt: "Primary bedroom suite with tray ceiling and sitting area",
  },
  {
    src: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=80",
    alt: "Spa-inspired primary bathroom with dual vanity and freestanding tub",
  },
];

const DEMO_FEATURES = [
  "Chef's kitchen with quartz countertops and professional-grade appliances",
  "Primary suite with tray ceiling, walk-in closet, and spa bathroom",
  "Open floor plan perfect for entertaining",
  "Three-car garage with EV charging rough-in",
  "Smart home features throughout (Nest, Ring, Sonos pre-wire)",
  "Fenced backyard with covered patio and gas firepit",
  "New HVAC (2025), roof (2024), and tankless water heater",
];

const DEMO_DESCRIPTION = `Welcome to this stunning, move-in-ready home that checks every box. From the moment you step inside, you are greeted by soaring ceilings, designer finishes, and thoughtful details that set this property apart.

The heart of the home is a true chef's kitchen with quartz countertops, a massive center island, and professional-grade appliances. It opens seamlessly into the great room, making it perfect for both daily living and entertaining.

The primary suite is a private retreat featuring a tray ceiling, oversized walk-in closet, and spa-inspired bathroom with a freestanding soaking tub and dual-head shower.

Outside, the fenced backyard is an entertainer's dream with a covered patio, gas firepit, and room to add a pool.

This is your chance to own a turnkey home in a sought-after location. Schedule your private showing today.`;

export async function POST() {
  try {
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminClient();

    // Only seed if the user has zero listings
    const { count } = await db
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", user.id);

    if ((count || 0) > 0) {
      return NextResponse.json({ error: "Demo already exists. Delete all listings first or go to My Listings." }, { status: 400 });
    }

    const { data: newListing, error } = await db
      .from("listings")
      .insert({
        agent_id: user.id,
        status: "draft",
        street: "123 Example Lane",
        city: "Cary",
        state: "NC",
        zip: "27513",
        price: 650000,
        beds: 4,
        baths: 3,
        sqft: 2850,
        year_built: 2020,
        lot_size: "0.28 acres",
        description: DEMO_DESCRIPTION,
        features: DEMO_FEATURES,
        photos: DEMO_PHOTOS,
        videos: [],
        virtual_tour_url: "",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Demo seed error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add slug
    try {
      const { generateSlug } = await import("@/lib/slug");
      const slug = generateSlug(newListing.street, newListing.city, newListing.id);
      await db.from("listings").update({ slug }).eq("id", newListing.id);
      newListing.slug = slug;
    } catch {
      // Slug generation isn't critical
    }

    return NextResponse.json({ ok: true, listing: newListing });
  } catch (err) {
    console.error("Demo seed error:", err);
    return NextResponse.json({ error: "Failed to seed demo" }, { status: 500 });
  }
}
