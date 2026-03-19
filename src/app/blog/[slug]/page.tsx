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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);

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
      "@id": `https://www.listingflare.com/blog/${post.slug}`,
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
        item: `https://www.listingflare.com/blog/${post.slug}`,
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

        {/* Content */}
        <div
          className="blog-content mt-10 text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

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
                  className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                    {r.category}
                  </span>
                  <h3 className="mt-2 font-serif text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {r.readingTime} min read
                  </p>
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
