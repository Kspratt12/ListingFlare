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
  agent: {
    name: string;
    title: string;
    brokerage: string;
    phone: string;
    email: string;
    headshotUrl: string;
    logoUrl?: string;
  };
}

// Placeholder images from picsum.photos (reliable, no API key needed)
const photo = (id: number, w = 1200, h = 800) =>
  `https://picsum.photos/id/${id}/${w}/${h}`;

export const demoListing: PropertyListing = {
  address: {
    street: "1847 Grandview Terrace",
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
    "Smart Home Automation",
    "Three-Car Garage",
    "Outdoor Kitchen & Pizza Oven",
    "Primary Suite with Ocean Terrace",
    "White Oak Hardwood Floors",
  ],
  photos: [
    { src: photo(164), alt: "Grand living room with ocean views" },
    { src: photo(188), alt: "Modern exterior at dusk" },
    { src: photo(165), alt: "Chef's kitchen with waterfall island" },
    { src: photo(177), alt: "Primary bedroom suite" },
    { src: photo(169), alt: "Spa-inspired master bathroom" },
    { src: photo(180), alt: "Infinity pool overlooking the Pacific" },
    { src: photo(189), alt: "Landscaped backyard with fire pit" },
    { src: photo(193), alt: "Dining room with chandelier" },
    { src: photo(199), alt: "Home office with built-in shelving" },
    { src: photo(200), alt: "Wine room and tasting area" },
    { src: photo(204), alt: "Outdoor entertaining area" },
    { src: photo(209), alt: "Three-car garage" },
  ],
  agent: {
    name: "Victoria Ashworth",
    title: "Luxury Property Specialist",
    brokerage: "Westside Luxury Realty",
    phone: "(310) 555-0192",
    email: "victoria@westsideluxury.com",
    headshotUrl: photo(64, 400, 400),
  },
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
