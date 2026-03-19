import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts, getRelatedPosts } from "@/lib/blog";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Article Not Found" };

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      authors: [post.author],
      url: `https://www.listingflare.com/blog/${post.slug}`,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.coverImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.coverImage],
    },
    alternates: {
      canonical: `https://www.listingflare.com/blog/${post.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

/** Extract H2 headings from HTML content for Table of Contents */
function extractHeadings(html: string): { id: string; text: string }[] {
  const regex = /<h2[^>]*>(.*?)<\/h2>/g;
  const headings: { id: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, "");
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    headings.push({ id, text });
  }
  return headings;
}

/** Inject id attributes into H2 tags so TOC links work */
function injectHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>(.*?)<\/h2>/g, (_match, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "");
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const headings = extractHeadings(post.content);
  const contentWithIds = injectHeadingIds(post.content);

  const articleUrl = `https://www.listingflare.com/blog/${post.slug}`;

  // JSON-LD structured data for BlogPosting
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      "@type": "Organization",
      name: "ListingFlare",
      url: "https://www.listingflare.com",
    },
    publisher: {
      "@type": "Organization",
      name: "ListingFlare",
      url: "https://www.listingflare.com",
    },
    image: {
      "@type": "ImageObject",
      url: post.coverImage,
      width: 1200,
      height: 630,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    wordCount: post.content.split(/\s+/).length,
    keywords: post.keywords.join(", "),
  };

  // Extract FAQ items for FAQPage schema
  const faqRegex =
    /<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/;
  const faqMatch = post.content.match(faqRegex);
  let faqJsonLd = null;

  if (faqMatch) {
    const faqHtml = faqMatch[1];
    const questionRegex =
      /<h3[^>]*>(.*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
    const faqItems: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[] = [];
    let match;
    while ((match = questionRegex.exec(faqHtml)) !== null) {
      faqItems.push({
        "@type": "Question",
        name: match[1].replace(/<[^>]*>/g, ""),
        acceptedAnswer: {
          "@type": "Answer",
          text: match[2].replace(/<[^>]*>/g, ""),
        },
      });
    }
    if (faqItems.length > 0) {
      faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems,
      };
    }
  }

  // Breadcrumb structured data
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.listingflare.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.listingflare.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-400">Flare</span>
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            &larr; All Articles
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            {post.category}
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-gray-900 md:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <span>{post.author}</span>
            <span>&middot;</span>
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
        </header>

        {/* Hero Image */}
        <div className="relative mt-8 aspect-[1200/630] w-full overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={post.coverImage}
            alt={post.coverImageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* Table of Contents */}
        {headings.length > 3 && (
          <nav className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              In This Article
            </h2>
            <ol className="mt-3 space-y-1.5">
              {headings.map((h, i) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
                  >
                    {i + 1}. {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Social Share */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Share
          </span>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on X (Twitter)"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on Facebook"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on LinkedIn"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
          <button
            onClick={undefined}
            className="flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Copy link"
            data-url={articleUrl}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Copy link
          </button>
        </div>

        {/* Content */}
        <div
          className="blog-content mt-10 text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentWithIds }}
        />

        {/* Social Share Bottom */}
        <div className="mt-10 flex items-center gap-3 border-t border-gray-100 pt-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Share this article
          </span>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on X (Twitter)"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on Facebook"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Share on LinkedIn"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
        </div>
      </article>

      {/* Newsletter CTA */}
      <section className="border-t border-gray-100 bg-brand-50 py-12">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-serif text-xl font-bold text-gray-900">
            Get real estate marketing tips in your inbox
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join agents who get our best strategies, templates, and market insights
            delivered weekly. No spam, unsubscribe anytime.
          </p>
          <form
            action="https://www.listingflare.com/signup"
            method="GET"
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3"
          >
            <input
              type="email"
              name="email"
              placeholder="you@brokerage.com"
              required
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-serif text-2xl font-bold text-gray-900">
              Keep Reading
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                    <Image
                      src={r.coverImage}
                      alt={r.coverImageAlt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                      {r.category}
                    </span>
                    <h3 className="mt-1.5 font-serif text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {r.readingTime} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            Turn every listing into a lead machine
          </h2>
          <p className="mt-3 text-gray-600">
            ListingFlare creates stunning single-property websites with AI
            chatbot, lead capture, and instant follow-up — so you never miss a
            buyer.
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
