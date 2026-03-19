export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  category: string;
  keywords: string[];
  readingTime: number;
  content: string;
}

// Registry — import all articles here
import { article as howToGetLeads } from "@/content/articles/how-to-get-leads-real-estate-agent";
import { article as bestLeadGenTools } from "@/content/articles/best-lead-generation-tools-real-estate-agents";
import { article as leadsForNewAgents } from "@/content/articles/real-estate-leads-new-agents";
import { article as leadScoringCriteria } from "@/content/articles/lead-scoring-criteria-real-estate-agents";
import { article as firstTimeSellerGuide } from "@/content/articles/first-time-home-sellers-guide";

const allPosts: BlogPost[] = [
  howToGetLeads,
  bestLeadGenTools,
  leadsForNewAgents,
  leadScoringCriteria,
  firstTimeSellerGuide,
];

// Sort by date descending
allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getAllPosts(): BlogPost[] {
  return allPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return allPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return allPosts.slice(0, limit);
  return allPosts
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 1 : 0;
      const bMatch = b.category === current.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}
