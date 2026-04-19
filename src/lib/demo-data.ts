export interface PropertyListing {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  lotSize: string;
  description: string;
  features: string[];
  photos: { src: string; alt: string }[];
  videos?: { src: string; thumbnail?: string; alt: string }[];
  agent: {
    name: string;
    title: string;
    brokerage: string;
    phone: string;
    email: string;
    headshotUrl: string;
    logoUrl?: string;
    instagram?: string;
    linkedin?: string;
    zillow?: string;
    realtor_com?: string;
    facebook?: string;
    website?: string;
  };
}

// High-quality Unsplash images for the demo listing
const unsplash = (id: string, w = 3840, h = 2560) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=90&auto=format`;

export const demoListing: PropertyListing = {
  address: {
    street: "1287 Chautauqua Blvd",
    city: "Pacific Palisades",
    state: "CA",
    zip: "90272",
  },
  price: 4750000,
  beds: 5,
  baths: 4.5,
  sqft: 4820,
  yearBuilt: 2019,
  lotSize: "0.38 acres",
  description: `Perched above the coastline with panoramic ocean views, this architectural masterpiece seamlessly blends indoor and outdoor living. Floor-to-ceiling glass walls frame breathtaking sunsets from nearly every room, while warm white oak floors and natural stone accents create an atmosphere of understated elegance.

The chef's kitchen features a 12-foot waterfall island, Gaggenau appliances, and a temperature-controlled wine room. The primary suite occupies the entire upper level with a spa-inspired bath, dual walk-in closets, and a private terrace overlooking the Pacific.

Outside, the zero-edge infinity pool appears to merge with the ocean horizon. Mature landscaping, an outdoor kitchen with built-in pizza oven, and a fire pit lounge area make this the ultimate entertainer's retreat. Smart home automation, a three-car garage, and proximity to Palisades Village complete this extraordinary offering.`,
  features: [
    "Panoramic Ocean Views",
    "Infinity Edge Pool & Spa",
    "Chef's Kitchen with Wine Room",
    "Smart Home Throughout",
    "Private Guest Suite",
    "Outdoor Kitchen & Pizza Oven",
    "Primary Suite with Ocean Terrace",
    "White Oak Hardwood Floors",
  ],
  photos: [
    { src: unsplash("photo-1600596542815-ffad4c1539a9"), alt: "Luxury modern home exterior at dusk" },
    { src: unsplash("photo-1600607687939-ce8a6c25118c"), alt: "Grand living room with floor-to-ceiling windows" },
    { src: unsplash("photo-1600566753086-00f18fb6b3ea"), alt: "Chef's kitchen with waterfall island" },
    { src: unsplash("photo-1600585154340-be6161a56a0c"), alt: "Modern exterior with pool at twilight" },
    { src: unsplash("photo-1616594039964-ae9021a400a0"), alt: "Spa-inspired primary bathroom" },
    { src: unsplash("photo-1613490493576-7fde63acd811"), alt: "Infinity pool overlooking the landscape" },
    { src: unsplash("photo-1600566753190-17f0baa2a6c3"), alt: "Elegant dining room" },
    { src: unsplash("photo-1616137466211-f939a420be84"), alt: "Luxurious primary bedroom suite" },
    { src: unsplash("photo-1600573472592-401b489a3cdc"), alt: "Modern home office" },
    { src: unsplash("photo-1600585154526-990dced4db0d"), alt: "Outdoor entertaining area" },
  ],
  videos: [
    { src: "/demo-pool.mp4", thumbnail: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=800&fit=crop&q=80", alt: "Luxury pool and exterior walkthrough" },
    { src: "/demo-bedroom.mp4", thumbnail: "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=600&h=800&fit=crop&q=80", alt: "Luxurious bedroom and bathroom tour" },
  ],
  agent: {
    name: "Victoria Ashworth",
    title: "Luxury Property Specialist",
    brokerage: "Westside Luxury Realty",
    phone: "(310) 555-0192",
    email: "victoria@westsideluxury.com",
    headshotUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop&q=90&auto=format",
  },
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
