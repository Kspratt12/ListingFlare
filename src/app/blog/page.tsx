import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Estate Agent Blog — Tips, Guides & Lead Generation Strategies",
  description:
    "Expert articles on real estate lead generation, listing marketing, and home selling. Actionable strategies to help agents grow their business in 2026.",
  openGraph: {
    title: "Real Estate Agent Blog — ListingFlare",
    description:
      "Expert articles on real estate lead generation, listing marketing, and home selling strategies.",
    url: "https://www.listingflare.com/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-400">Flare</span>
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-5xl px-6 pt-16 pb-12">
        <h1 className="font-serif text-4xl font-bold text-gray-900 md:text-5xl">
          The ListingFlare Blog
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Actionable strategies for real estate agents who want more leads, better
          listings, and faster closings.
        </p>
      </header>

      {/* Posts Grid */}
      <main className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-gray-200 p-6 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                {post.category}
              </span>
              <h2 className="mt-2 font-serif text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                {post.description}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <span>&middot;</span>
                <span>{post.readingTime} min read</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            Ready to capture more leads from every listing?
          </h2>
          <p className="mt-3 text-gray-600">
            ListingFlare gives each property its own stunning website with AI
            chatbot, lead capture, and instant follow-up.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/demo"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              See a Demo
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
