import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("agent_id", user.id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("name, phone, brokerage")
      .eq("id", user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://listing-flare.vercel.app";
    const signInUrl = `${appUrl}/open-house/${listingId}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(signInUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    const photos = (listing.photos as { src: string; alt: string }[]) || [];
    const heroUrl = photos[0]?.src || "";
    const price = listing.price ? `$${Number(listing.price).toLocaleString("en-US")}` : "";

    // Return flyer data as HTML that can be printed
    const flyerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Open House - ${listing.street}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; width: 8.5in; height: 11in; padding: 0.5in; background: white; }
    .flyer { border: 3px solid #0f172a; border-radius: 16px; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
    .hero { height: 3.5in; background: url('${heroUrl}') center/cover no-repeat; position: relative; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)); display: flex; align-items: flex-end; padding: 24px 32px; }
    .hero-text { color: white; }
    .hero-text h1 { font-family: 'Playfair Display', serif; font-size: 32px; }
    .hero-text p { font-size: 16px; opacity: 0.9; margin-top: 4px; }
    .content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; }
    .open-house-tag { background: #b8965a; color: white; font-weight: 600; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 24px; border-radius: 50px; display: inline-block; margin-bottom: 20px; }
    .price { font-family: 'Playfair Display', serif; font-size: 42px; color: #0f172a; margin-bottom: 8px; }
    .details { font-size: 16px; color: #6b7280; margin-bottom: 32px; }
    .qr-section { margin: 20px 0; }
    .qr-section img { width: 200px; height: 200px; }
    .scan-text { font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 12px; }
    .scan-sub { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .agent-info { margin-top: auto; padding-top: 20px; border-top: 1px solid #e5e7eb; width: 100%; }
    .agent-name { font-weight: 600; color: #0f172a; font-size: 16px; }
    .agent-detail { color: #6b7280; font-size: 14px; margin-top: 2px; }
    @media print { body { padding: 0; } .flyer { border: 2px solid #0f172a; } }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="hero">
      <div class="hero-overlay">
        <div class="hero-text">
          <h1>${listing.street}</h1>
          <p>${listing.city}, ${listing.state} ${listing.zip}</p>
        </div>
      </div>
    </div>
    <div class="content">
      <div class="open-house-tag">Open House</div>
      <div class="price">${price}</div>
      <div class="details">${listing.beds} Bed &bull; ${listing.baths} Bath &bull; ${Number(listing.sqft).toLocaleString()} Sq Ft</div>
      <div class="qr-section">
        <img src="${qrDataUrl}" alt="QR Code" />
        <div class="scan-text">Scan to Sign In</div>
        <div class="scan-sub">We'll keep you updated on this property</div>
      </div>
      <div class="agent-info">
        <div class="agent-name">${agent?.name || ""}</div>
        ${agent?.phone ? `<div class="agent-detail">${formatPhone(agent.phone)}</div>` : ""}
        ${agent?.brokerage ? `<div class="agent-detail">${agent.brokerage}</div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(flyerHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Flyer generation error:", err);
    return NextResponse.json({ error: "Failed to generate flyer" }, { status: 500 });
  }
}
