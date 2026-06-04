"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";

const services = [
  {
    id: "01",
    title: "Revenue Intelligence Engine",
    desc: "Pipeline and forecast signals wired to your CRM — leadership sees reality, not spreadsheet fiction.",
    tags: ["HubSpot", "Mixpanel", "Claude"],
    icon: (
      <path
        d="M3 17l6-6 4 4 8-10M21 7v6h-6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "02",
    title: "Churn Prediction & Save",
    desc: "Risk scores and save plays before renewals slip — automated outreach when accounts go cold.",
    tags: ["Postgres", "Slack", "n8n"],
    icon: (
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    ),
  },
  {
    id: "03",
    title: "Outbound GTM Automation",
    desc: "Sequences, enrichment, and reply routing on autopilot — your SDR stack without the headcount.",
    tags: ["WhatsApp API", "HubSpot", "Zapier"],
    icon: (
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "04",
    title: "Finance Ops & GST Layer",
    desc: "Invoicing, reconciliation, and compliance — no spreadsheet chaos at month-end.",
    tags: ["Retool", "Notion", "APIs"],
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
  {
    id: "05",
    title: "AI Customer Support OS",
    desc: "Triage, drafts, and escalation with human-in-the-loop — faster resolution, fewer tickets.",
    tags: ["Claude AI", "Slack", "n8n"],
    icon: (
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    ),
  },
  {
    id: "06",
    title: "Hiring & Onboarding",
    desc: "Offer-to-day-one flows that actually complete — contracts, access, and checklists in one pipeline.",
    tags: ["Notion", "Zapier", "WhatsApp"],
    icon: (
      <>
        <path
          d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
];

export function Capabilities() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headerX = useTransform(scrollYProgress, [0, 0.35], [reduce ? 0 : 40, 0]);

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="capabilities-section relative overflow-hidden border-t border-white/[0.06] py-20 md:py-28"
    >
      <div className="capabilities-glow" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
        <motion.div style={{ x: headerX }}>
          <Reveal>
            <p className="section-eyebrow">Capabilities</p>
            <h2 className="section-headline mt-3 max-w-2xl">
              Six systems. One studio.
            </h2>
            <p className="section-body mt-4 max-w-xl">
              Scroll the stack → each card is a production-grade workflow we deploy
              with Claude AI, n8n, and your existing tools.
            </p>
          </Reveal>
        </motion.div>

        <p className="mt-6 flex items-center gap-2 text-[12px] text-white/35 md:hidden">
          <span className="inline-block h-px w-8 bg-white/20" />
          Swipe to explore
          <span className="capability-scroll-hint" aria-hidden="true">→</span>
        </p>
      </div>

      <div
        ref={trackRef}
        className="capability-track relative z-10 mt-10 flex gap-5 overflow-x-auto px-6 pb-6 pt-2 md:mt-14 md:gap-6 md:px-[max(1.5rem,calc((100vw-72rem)/2+2rem))] md:pb-10"
      >
        {services.map((s, i) => (
          <motion.article
            key={s.id}
            className={cn("capability-card group shrink-0 snap-center")}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-5%" }}
            transition={{ delay: i * 0.06, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="capability-card-inner">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[11px] font-medium tracking-wider text-[#2997ff]">
                  {s.id}
                </span>
                <div className="capability-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    {s.icon}
                  </svg>
                </div>
              </div>
              <h3 className="mt-6 text-[22px] font-semibold leading-tight tracking-tight text-white">
                {s.title}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/50">
                {s.desc}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {s.tags.map((tag) => (
                  <span key={tag} className="capability-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="capability-card-line" aria-hidden="true" />
            </div>
          </motion.article>
        ))}
      </div>

      {/* Desktop progress dots */}
      <div className="relative z-10 mx-auto mt-8 hidden max-w-6xl justify-center gap-2 px-8 md:flex">
        {services.map((s) => (
          <span key={s.id} className="h-1 w-8 rounded-full bg-white/10" title={s.title} />
        ))}
      </div>
    </section>
  );
}
