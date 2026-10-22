import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private app routes, auth callbacks and token-gated seller portals
        disallow: ["/dashboard", "/dashboard/", "/api/", "/auth/", "/seller/"],
      },
    ],
    sitemap: "https://www.listingflare.com/sitemap.xml",
    host: "https://www.listingflare.com",
  };
}
