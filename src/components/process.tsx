"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "@/components/ui/reveal";
import { SectionScenery } from "@/components/section-scenery";

const steps = [
  {
    num: "01",
    title: "Audit",
    desc: "We map your ops in 48 hours — workflows, tools, bottlenecks, revenue leaks.",
    meta: "48 hours",
  },
  {
    num: "02",
    title: "Build",
    desc: "Working demo live in 7 days. Real data, real integrations, real ROI signal.",
    meta: "7 days",
  },
  {
    num: "03",
    title: "Scale",
    desc: "Retainer-backed evolution. Your automation stack grows with your ARR.",
    meta: "Ongoing",
  },
];

export function Process() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const lineScale = useTransform(scrollYProgress, [0.15, 0.55], [0, 1]);

  return (
    <section
      id="process"
      ref={ref}
      className="section-pad relative overflow-hidden border-t border-white/[0.06]"
    >
      <SectionScenery variant="waves" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
        <Reveal>
          <p className="section-eyebrow">How we work</p>
          <h2 className="section-headline mt-3">Ship fast. Scale forever.</h2>
        </Reveal>

        <motion.div
          className="process-progress-line mx-auto mb-10 hidden h-px max-w-4xl origin-left bg-gradient-to-r from-[#2997ff] to-transparent md:block"
          style={{ scaleX: reduce ? 1 : lineScale }}
          aria-hidden="true"
        />
        <div className="mt-8 space-y-3 md:mt-0">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <article className="process-row group">
                <span className="font-mono text-[13px] text-white/35">{step.num}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[22px] font-semibold tracking-tight text-white md:text-[26px]">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/50">
                    {step.desc}
                  </p>
                </div>
                <span className="process-pill">{step.meta}</span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
