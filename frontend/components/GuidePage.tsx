"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileQuestion,
  FileText,
  FolderOpen,
  HelpCircle,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  UploadCloud,
  UserCheck
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { canReview } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";

type HelpTask = {
  id: string;
  title: string;
  summary: string;
  action: string;
  href: string;
  icon: typeof Search;
  opsOnly?: boolean;
};

type HelpArticle = {
  id: string;
  title: string;
  detail: string;
  advanced?: boolean;
};

type HelpPolicy = {
  id: string;
  title: string;
  detail: string;
  opsOnly?: boolean;
};

type HelpFaq = {
  question: string;
  answer: string;
};

type LocalRequestReceipt = {
  id?: unknown;
  status?: unknown;
};

export function requestHelpHref(type: string) {
  return `/requests?type=${encodeURIComponent(type)}`;
}

export function isLocalRequestReceiptOpen(status: unknown) {
  const label = String(status || "Local receipt").toLowerCase();
  return !/approved|cancelled|closed|complete|done|downloaded|published|resolved|synced/.test(label);
}

const localRequestReceiptKeys = [
  "tjc-media-request-receipts-v1",
  "tjc-help-request-receipts-v1"
];

const gettingStarted = [
  { label: "1. Find media", detail: "Search by event, ministry, topic, or intended use.", icon: Search },
  { label: "2. Check usage", detail: "Open the item and read the visible use guidance.", icon: ShieldCheck },
  { label: "3. Request permission if needed", detail: "Ask before using anything unclear, sensitive, or restricted.", icon: FileQuestion },
  { label: "4. Use only after review/clearance", detail: "Wait for the media team when permission is unclear.", icon: UserCheck }
];

function helpTasks(opsView: boolean): HelpTask[] {
  return [
    {
      id: "find-media",
      title: "Find media",
      summary: "Search for photos and collections by ministry, event, topic, or use.",
      action: "Search library",
      href: "/library",
      icon: Search
    },
    {
      id: "upload-photos",
      title: "Upload photos",
      summary: "Send a focused batch with event, people, and permission notes.",
      action: "Start upload",
      href: "/upload",
      icon: UploadCloud
    },
    {
      id: "check-uploads",
      title: "Check my uploads",
      summary: "Review recent submissions saved on this browser.",
      action: "Open uploads",
      href: "/recent-uploads",
      icon: Inbox
    },
    {
      id: "request-permission",
      title: "Request permission",
      summary: "Ask before public, sensitive, unclear, or new use.",
      action: "Start request",
      href: requestHelpHref("Request permission"),
      icon: FileQuestion
    },
    {
      id: "privacy-rights",
      title: "Report a privacy or rights issue",
      summary: "Flag consent, copyright, credit, removal, or sensitive-media concerns.",
      action: "Report issue",
      href: requestHelpHref("Report privacy or rights issue"),
      icon: AlertTriangle
    },
    {
      id: "original-files",
      title: opsView ? "Ask for source/high-resolution access" : "Request help with original files",
      summary: opsView
        ? "Use a tracked request when original or high-resolution access is needed."
        : "Ask the media team when a normal preview is not enough.",
      action: "Ask for help",
      href: requestHelpHref("Request original or high-resolution help"),
      icon: Camera
    },
    {
      id: "contact-team",
      title: "Contact media team",
      summary: "Send a question with the event, deadline, audience, and intended use.",
      action: "Contact team",
      href: requestHelpHref("General media help"),
      icon: MessageCircle
    }
  ];
}

const usefulArticles: HelpArticle[] = [
  {
    id: "find-media",
    title: "Find media for church use",
    detail: "Search broadly first, then narrow by event, ministry, topic, people, or intended channel."
  },
  {
    id: "upload-photos",
    title: "Prepare a photo upload",
    detail: "Send one event or ministry batch at a time with dates, people notes, and permission context."
  },
  {
    id: "usage-check",
    title: "Check whether media can be used",
    detail: "Read the visible guidance and ask for permission when the audience, channel, or people shown are unclear."
  },
  {
    id: "request-permission",
    title: "Request permission for a new use",
    detail: "Include where the media will appear, who will see it, when you need it, and why it matters."
  },
  {
    id: "privacy-issue",
    title: "Report privacy or rights concerns",
    detail: "Pause use and contact the media team if consent, credit, ownership, or removal is disputed."
  }
];

const advancedArticles: HelpArticle[] = [
  {
    id: "review-flow",
    title: "How review and clearance works",
    detail: "Reviewers check people, consent, usage scope, ownership, and sensitivity before broader use."
  },
  {
    id: "original-access",
    title: "Original and high-resolution requests",
    detail: "Reviewer/admin access requests need a ministry purpose, deadline, audience, and handling plan.",
    advanced: true
  },
  {
    id: "photo-beta",
    title: "Current photo support",
    detail: "Photo workflows are prioritized; audio, video, and documents may need separate review timing."
  },
  {
    id: "review-evidence",
    title: "People and minors review",
    detail: "Reviewers should confirm visible people, youth/minors possibility, permission evidence, and allowed audience.",
    advanced: true
  }
];

function policyItems(opsView: boolean): HelpPolicy[] {
  const publicPolicies: HelpPolicy[] = [
    { id: "usage", title: "Usage rules", detail: "Use media only for the audience, channel, and purpose that has been cleared." },
    { id: "privacy", title: "Privacy and consent", detail: "Ask before using media with children, sensitive settings, or unclear permission." },
    { id: "restricted", title: "Restricted media", detail: "Do not use items marked restricted, private, unclear, or needing review." },
    { id: "ask", title: "When to ask permission", detail: "Ask for public use, new channels, people concerns, edits, or urgent deadlines." }
  ];

  if (!opsView) return publicPolicies;

  return [
    ...publicPolicies,
    { id: "rights-consent", title: "Rights & consent", detail: "Review owner, license, consent, credit, expiry, and allowed audience.", opsOnly: true },
    { id: "source-access", title: "Source access", detail: "Use tracked approval for original or high-resolution handling.", opsOnly: true },
    { id: "metadata", title: "Metadata standards", detail: "Keep event, ministry, date, people notes, usage scope, and reviewer fields consistent.", opsOnly: true },
    { id: "admin-escalation", title: "Admin escalation", detail: "Route blocked media issues through the reviewer/admin request queue.", opsOnly: true }
  ];
}

const faqs: HelpFaq[] = [
  {
    question: "Can I use a photo as soon as I find it?",
    answer: "Use it only when the visible guidance clearly supports your audience, channel, and purpose."
  },
  {
    question: "When should I request permission?",
    answer: "Request permission when public use, people shown, ownership, edits, audience, or deadline is unclear."
  },
  {
    question: "How do I check my uploads?",
    answer: "Open Recent Uploads to see submissions saved on this browser; these receipts are local and limited."
  },
  {
    question: "What should I include in a help request?",
    answer: "Include the media item, event, intended use, audience, deadline, ministry owner, and the question you need answered."
  }
];

const reviewReasons = [
  "Public or external use is planned",
  "People, privacy, or children may be involved",
  "Permission, ownership, or credit is unclear",
  "Original or high-resolution handling is needed"
];

const quickLinks = [
  { title: "Library", detail: "Search media and collections", href: "/library", icon: FolderOpen },
  { title: "Upload photos", detail: "Send a focused photo batch", href: "/upload", icon: UploadCloud },
  { title: "Recent uploads", detail: "Check browser-saved submissions", href: "/recent-uploads", icon: Inbox },
  { title: "Use rules", detail: "Read media-use policies", href: "#policies", icon: BookOpen }
];

function textMatches(query: string, fields: string[]) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = fields.join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function readLocalRequestReceiptCount() {
  try {
    for (const key of localRequestReceiptKeys) {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
      if (!Array.isArray(parsed)) continue;
      const open = parsed.filter((item): item is LocalRequestReceipt => {
        if (!item || typeof item !== "object") return false;
        return isLocalRequestReceiptOpen((item as LocalRequestReceipt).status);
      });
      if (open.length) return open.length;
    }
  } catch {
    return 0;
  }
  return 0;
}

export function GuidePage({ policyCenter = false }: { policyCenter?: boolean }) {
  const { role } = useDemoRole();
  const opsView = canReview(role);
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [localReceiptCount, setLocalReceiptCount] = useState(0);

  useEffect(() => {
    setLocalReceiptCount(readLocalRequestReceiptCount());
  }, []);

  const tasks = useMemo(() => helpTasks(opsView), [opsView]);
  const policies = useMemo(() => policyItems(opsView), [opsView]);
  const articles = useMemo(
    () => opsView ? [...usefulArticles, ...advancedArticles] : [...usefulArticles, ...advancedArticles.filter((article) => !article.advanced)],
    [opsView]
  );

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return { tasks: [], articles: [], policies: [] };
    return {
      tasks: tasks.filter((task) => textMatches(trimmed, [task.title, task.summary, task.action])),
      articles: articles.filter((article) => textMatches(trimmed, [article.title, article.detail])),
      policies: policies.filter((policy) => textMatches(trimmed, [policy.title, policy.detail]))
    };
  }, [articles, policies, query, tasks]);

  const hasSearch = query.trim().length > 0;
  const hasSearchResults = searchResults.tasks.length || searchResults.articles.length || searchResults.policies.length;
  const shownArticles = usefulArticles.slice(0, policyCenter ? 4 : 5);
  const hiddenArticles = articles.filter((article) => !shownArticles.some((shown) => shown.id === article.id));

  const roleHref = (href: string) => routeWithRole(href, role);

  return (
    <div className="dam-help-center" data-route-identity="help">
      <main className="help-center-main">
        <section className="help-center-hero" aria-labelledby="help-center-title">
          <div>
            <h1 id="help-center-title">Help Center</h1>
            <p>Start with the task you need to do. Search when you need article or policy wording.</p>
          </div>
        </section>

        <section className="help-primary-tasks" aria-labelledby="primary-help-title">
          <header>
            <h2 id="primary-help-title">What do you need to do?</h2>
          </header>
          <div className="help-task-card-grid">
            {tasks.map((task) => {
              const TaskIcon = task.icon;
              return (
                <Link className="help-task-card" href={roleHref(task.href)} key={task.id}>
                  <span className="help-task-icon"><TaskIcon size={22} strokeWidth={1.85} aria-hidden="true" /></span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.summary}</small>
                    <em>{task.action} <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></em>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="help-search-panel" aria-labelledby="help-search-title">
          <header>
            <h2 id="help-search-title">Find guidance</h2>
            <p>Search tasks, articles, and media-use rules.</p>
          </header>
          <form className="help-center-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <Search size={20} strokeWidth={1.9} aria-hidden="true" />
            <label htmlFor="help-center-search-input" className="sr-only">Search help articles, tasks, or policies</label>
            <input
              id="help-center-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help articles, tasks, or policies..."
            />
          </form>
        </section>

        {hasSearch ? (
          <section className="help-search-results" aria-labelledby="help-search-results-title" aria-live="polite">
            <header>
              <h2 id="help-search-results-title">Search results</h2>
              <span>{hasSearchResults ? `${searchResults.tasks.length + searchResults.articles.length + searchResults.policies.length} found` : "No matches yet"}</span>
            </header>
            {hasSearchResults ? (
              <div className="help-search-result-groups">
                {searchResults.tasks.length ? (
                  <div>
                    <h3>Tasks</h3>
                    {searchResults.tasks.map((task) => {
                      const TaskIcon = task.icon;
                      return (
                        <Link className="help-search-result" href={roleHref(task.href)} key={task.id}>
                          <TaskIcon size={18} strokeWidth={1.8} aria-hidden="true" />
                          <span><strong>{task.title}</strong><small>{task.action}</small></span>
                          <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
                {searchResults.articles.length ? (
                  <div>
                    <h3>Articles</h3>
                    {searchResults.articles.slice(0, 4).map((article) => (
                      <a className="help-search-result" href={`#article-${article.id}`} key={article.id}>
                        <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
                        <span><strong>{article.title}</strong><small>{article.detail}</small></span>
                        <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {searchResults.policies.length ? (
                  <div>
                    <h3>Policies</h3>
                    {searchResults.policies.slice(0, 4).map((policy) => (
                      <a className="help-search-result" href={`#policy-${policy.id}`} key={policy.id}>
                        <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                        <span><strong>{policy.title}</strong><small>{policy.detail}</small></span>
                        <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="help-empty-state" role="status">
                <HelpCircle size={28} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <strong>No help results found</strong>
                  <p>Try “permission,” “upload,” “privacy,” or contact the media team for help.</p>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section className="help-center-start" aria-labelledby="getting-started-title">
          <h2 id="getting-started-title">Getting started</h2>
          <div className="help-start-steps">
            {gettingStarted.map((item, index) => {
              const StepIcon = item.icon;
              return (
                <article key={item.label}>
                  <span><StepIcon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  {index < gettingStarted.length - 1 ? <ArrowRight className="help-step-arrow" size={18} strokeWidth={1.8} aria-hidden="true" /> : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="help-center-tasks" data-primary-section="help-articles" aria-labelledby="help-articles-title">
          <h2 id="help-articles-title">Helpful articles</h2>
          <div className="help-article-grid">
            {shownArticles.map((article) => (
              <article id={`article-${article.id}`} key={article.id}>
                <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <strong>{article.title}</strong>
                  <p>{article.detail}</p>
                </div>
              </article>
            ))}
          </div>
          {hiddenArticles.length ? (
            <details className="help-article-details" open={hasSearch}>
              <summary>View all articles</summary>
              <div className="help-article-grid">
                {hiddenArticles.map((article) => (
                  <article id={`article-${article.id}`} key={article.id}>
                    <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
                    <div>
                      <strong>{article.title}</strong>
                      <p>{article.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <section id="faq" className="help-center-faq" aria-labelledby="faq-title">
          <header>
            <h2 id="faq-title">Questions people ask</h2>
          </header>
          <div className="help-faq-list">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              const contentId = `help-faq-${index}`;
              return (
                <article className={isOpen ? "is-open" : ""} key={item.question}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} aria-expanded={isOpen} aria-controls={contentId}>
                    <span>{item.question}</span>
                    <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  {isOpen ? <p id={contentId}>{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </section>

        <section id="policies" className="help-center-tasks help-policy-section" aria-labelledby="help-policies-title">
          <h2 id="help-policies-title">Media-use rules</h2>
          <div className="help-policy-grid">
            {policies.map((item) => (
              <article id={`policy-${item.id}`} className={item.opsOnly ? "is-advanced" : ""} key={item.id}>
                <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="help-center-rail" aria-label="Media help actions">
        <section className="help-review-card">
          <header>
            <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <h2>Need help?</h2>
              <p>Start a request when a media item, upload, permission question, or rights concern needs a person.</p>
            </div>
          </header>
          <Link className="help-review-primary" href={roleHref("/requests")}>Start a request <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></Link>
          <Link className="help-review-secondary" href={roleHref("/requests")}>View local receipts <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></Link>
        </section>

        {localReceiptCount > 0 ? (
          <section className="help-side-card" aria-label="Local open request receipts">
            <h2>Local request receipts</h2>
            <div className="help-open-requests">
              <span><strong>{localReceiptCount}</strong><small>On this browser</small></span>
            </div>
            <Link className="help-review-secondary" href={roleHref("/requests")}>Open request receipts <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></Link>
          </section>
        ) : null}

        <section id="request-review" className="help-side-card">
          <h2>When to ask</h2>
          <ul className="help-check-list">
            {reviewReasons.map((reason) => (
              <li key={reason}><CheckCircle2 size={15} strokeWidth={1.9} aria-hidden="true" />{reason}</li>
            ))}
          </ul>
        </section>

        <section className="help-side-card">
          <h2>Quick links</h2>
          <div className="help-link-list">
            {quickLinks.map((item) => {
              const LinkIcon = item.icon;
              return (
                <Link href={roleHref(item.href)} key={item.title}>
                  <LinkIcon size={21} strokeWidth={1.8} aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="help-side-card">
          <h2>Good request details</h2>
          <div className="help-link-list is-policy">
            {[
              ["Media item", "Link, title, or clear description"],
              ["Intended use", "Audience, channel, and deadline"],
              ["People shown", "Children, privacy, or sensitivity notes"],
              ["Decision needed", "Permission, issue report, upload help, or original-file help"]
            ].map(([title, detail]) => (
              <div className="help-info-row" key={title}>
                <FileText size={20} strokeWidth={1.8} aria-hidden="true" />
                <span><strong>{title}</strong><small>{detail}</small></span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
