"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileCheck2,
  FileLock2,
  FileText,
  FolderOpen,
  Globe2,
  MessageCircle,
  Search,
  ShieldCheck,
  UploadCloud
} from "lucide-react";

type HelpTask = {
  id: string;
  title: string;
  summary: string;
  href: string;
  icon: typeof Search;
};

type HelpFaq = {
  question: string;
  answer: string;
};

const gettingStarted = [
  { label: "1. Find media", detail: "Search by use case, event, ministry, topic, or package.", icon: Search },
  { label: "2. Check status", detail: "Open the record to review approval, rights, and usage.", icon: ShieldCheck },
  { label: "3. Download", detail: "Download the approved derivative for your intended use.", icon: Download },
  { label: "4. If unsure", detail: "Request DAM review for help or additional access.", icon: ArrowRight }
];

const commonTasks: HelpTask[] = [
  { id: "find", title: "Find approved media", summary: "Search by use case, event, ministry, topic, or package.", href: "/", icon: Search },
  { id: "status", title: "Check approval status", summary: "View approval, rights, usage scope, and expiration.", href: "/", icon: ShieldCheck },
  { id: "download", title: "Download approved copy", summary: "Open the record and download the approved derivative.", href: "/", icon: Download },
  { id: "collection", title: "Use a collection", summary: "Start from a curated ministry collection and confirm each item.", href: "/collections", icon: FolderOpen },
  { id: "source", title: "Request source-file access", summary: "Request access to source/original files when needed.", href: "/requests", icon: FileLock2 },
  { id: "send", title: "Send media for review", summary: "Submit files or links for review and approval.", href: "/upload", icon: UploadCloud },
  { id: "public", title: "Public / external use", summary: "Review rules for public, social, and external use.", href: "/help#policies", icon: Globe2 },
  { id: "incident", title: "Rights incident or takedown", summary: "Report rights issues or request content removal.", href: "/requests", icon: FileCheck2 }
];

const reviewReasons = [
  "Approval, rights, or scope is unclear",
  "Need access to source/original files",
  "New use, audience, or channel",
  "Rights incident or takedown"
];

const quickLinks = [
  { title: "Collections", detail: "Open ministry collections and kits", href: "/collections", icon: FolderOpen },
  { title: "Recent uploads", detail: "Open recent intake ledger", href: "/recent-uploads", icon: UploadCloud },
  { title: "Source-file access", detail: "Read request guidance", href: "#source-access", icon: FileLock2 },
  { title: "Review requests", detail: "Open request operations", href: "/requests", icon: FileText }
];

const policies = [
  { title: "Usage policy", detail: "Approved uses and restrictions" },
  { title: "Rights & consent", detail: "Copyright, consent, and licensing" },
  { title: "Official TJC Identity Site ↗", detail: "Logo, color, typography, and identity guidance.", href: "https://identity.tjc.org", external: true },
  { title: "Public use rules", detail: "Social, web, and external distribution" },
  { title: "Metadata standards", detail: "Naming, tagging, and descriptions" }
];

const helpArticles = [
  {
    title: "Use approved derivatives",
    detail: "Download only the approved copy for the intended channel. Source/original access stays restricted."
  },
  {
    title: "Request source access",
    detail: "Open a request only when approved derivatives are not enough. Include use scope, deadline, and ministry owner."
  },
  {
    title: "Report a rights issue",
    detail: "Pause distribution when license, consent, credit, takedown, or public-use scope is unclear."
  },
  {
    title: "Review people/minors evidence",
    detail: "Confirm visible people, youth/minors possibility, consent evidence, and allowed audience before external use."
  },
  {
    title: "Build a distribution set",
    detail: "Collect approved references for an internal set without copying source files or bypassing item-level clearance."
  },
  {
    title: "Understand source custody model",
    detail: "The portal shows role-safe records. Source custody and approval evidence remain governed by DAM policy."
  },
  {
    title: "Why downloads are locked",
    detail: "Downloads stay locked when evidence, approved derivative, reviewer date, or use scope is missing."
  },
  {
    title: "What Portal Ready means",
    detail: "Portal Ready means current evidence supports the shown use scope. It is not a blanket public approval."
  }
];

const faqs: HelpFaq[] = [
  {
    question: "What is an approved derivative?",
    answer: "The approved derivative is the safe copy cleared for distribution. Source/original access is restricted by default."
  },
  {
    question: "How do I know if I can use this media publicly?",
    answer: "Open the media record and confirm approval status, usage scope, rights evidence, consent notes, reviewer, and review date. If any part is unclear, request DAM review."
  },
  {
    question: "What should I do if I need source files?",
    answer: "Submit a source-file access request. Include the record, ministry use, deadline, and why the approved derivative is not enough."
  },
  {
    question: "How long is media approved for?",
    answer: "Use the review date and expiration or re-review notes on the media record. If approval looks old or scope changed, request a new review."
  }
];

export function GuidePage({ policyCenter = false }: { policyCenter?: boolean }) {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const visibleTasks = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return commonTasks;
    return commonTasks.filter((task) => {
      const haystack = `${task.title} ${task.summary}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query]);

  const leftTasks = visibleTasks.filter((_, index) => index % 2 === 0);
  const rightTasks = visibleTasks.filter((_, index) => index % 2 === 1);

  return (
    <div className="dam-help-center" data-route-identity="help">
      <main className="help-center-main">
        <section className="help-center-hero" aria-labelledby="help-center-title">
          <div>
            <h1 id="help-center-title">{policyCenter ? "Policy Center" : "Help Center"}</h1>
            <p>{policyCenter ? "Policy-safe DAM guidance for reuse, rights, consent, and metadata standards." : "DAM guidance, rights policy, and role-safe support instructions."}</p>
          </div>
          <form className="help-center-search" role="search">
            <Search size={19} strokeWidth={1.9} aria-hidden="true" />
            <label htmlFor="help-center-search-input" className="sr-only">Search help articles, topics, and guides</label>
            <input
              id="help-center-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help articles, topics, and guides..."
            />
          </form>
        </section>

        <section className="help-center-proof" aria-label="Safe copy rule">
          <span><ShieldCheck size={22} strokeWidth={1.9} aria-hidden="true" /></span>
          <div>
            <strong>Approved derivative is the safe copy</strong>
            <p>Use the approved copy for distribution. Source/original access is restricted by default.</p>
            <Link href="#faq">Learn more about safe reuse <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>

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
          <h2 id="help-articles-title">Help articles</h2>
          <div className="help-article-grid">
            {helpArticles.map((article) => (
              <article id={article.title === "Request source access" ? "source-access" : undefined} key={article.title}>
                <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <strong>{article.title}</strong>
                  <p>{article.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="help-center-tasks" aria-labelledby="common-tasks-title">
          <h2 id="common-tasks-title">Common tasks</h2>
          {visibleTasks.length ? (
            <div className="help-task-columns">
              {[leftTasks, rightTasks].map((tasks, columnIndex) => (
                <div className="help-task-column" key={columnIndex}>
                  {tasks.map((task) => {
                    const TaskIcon = task.icon;
                    return (
                      <Link className="help-task-row" href={task.href} key={task.id}>
                        <TaskIcon size={22} strokeWidth={1.85} aria-hidden="true" />
                        <span>
                          <strong>{task.title}</strong>
                          <small>{task.summary}</small>
                        </span>
                        <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="help-empty-result">No help task matched. Request DAM review when unsure.</p>
          )}
        </section>

        <section id="faq" className="help-center-faq" aria-labelledby="faq-title">
          <header>
            <h2 id="faq-title">Help topics (FAQ)</h2>
            <Link href="/help">View all articles <ArrowRight size={15} aria-hidden="true" /></Link>
          </header>
          <div className="help-faq-list">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article className={isOpen ? "is-open" : ""} key={item.question}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} aria-expanded={isOpen}>
                    <span>{item.question}</span>
                    <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  {isOpen ? <p>{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <aside className="help-center-rail" aria-label="Media help documentation">
        <section className="help-side-card">
          <h2>Documentation scope</h2>
          <p className="help-side-copy">This page explains DAM rules and safe support paths. Request records live in Requests. Assigned work lives in My Tasks.</p>
        </section>

        <section className="help-side-card">
          <h2>My open requests</h2>
          <div className="help-open-requests">
            <span><strong>2</strong><small>Waiting on me</small></span>
            <span><strong>4</strong><small>Open total</small></span>
          </div>
          <Link className="help-review-primary" href="/requests">
            Open Requests <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </section>

        <section id="request-review" className="help-review-card">
          <header>
            <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <h2>How to request DAM review</h2>
              <p>If approval, source access, rights, or use scope is unclear, open a request with enough context for safe triage.</p>
            </div>
          </header>
          <Link className="help-review-primary" href="/requests">Open Requests <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" /></Link>
          <div>
            <h3>When to request review</h3>
            <ul>
              {reviewReasons.map((reason) => (
                <li key={reason}><CheckCircle2 size={15} strokeWidth={1.9} aria-hidden="true" />{reason}</li>
              ))}
            </ul>
          </div>
          <Link href="#faq">Learn more about request types <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>

        <section className="help-side-card">
          <h2>Quick links</h2>
          <div className="help-link-list">
            {quickLinks.map((item) => {
              const LinkIcon = item.icon;
              return (
                <Link href={item.href} key={item.title}>
                  <LinkIcon size={21} strokeWidth={1.8} aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>

        <section id="policies" className="help-side-card">
          <h2>Policies &amp; Guidelines</h2>
          <div className="help-link-list is-policy">
            {policies.map((item) => (
              <Link href={item.href || "/help"} key={item.title} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}>
                <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                {item.external ? <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" /> : null}
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
