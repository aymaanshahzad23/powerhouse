"use client";

import { Reveal } from "@/components/ui/reveal";

export function Cta() {
  return (
    <section id="book" className="section-pad">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <Reveal>
          <div className="cta-panel relative overflow-hidden rounded-3xl px-8 py-16 md:px-14 md:py-20">
            <div className="cta-glow" aria-hidden="true" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                Ready to automate your ops?
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-white/55">
                We take 3 new clients per quarter. Book a free 30-minute audit — we&apos;ll
                show you exactly what we&apos;d build in your stack.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#" className="btn-apple btn-apple-primary">
                  Book free audit
                </a>
                <a href="mailto:hello@powerhouse.studio" className="btn-apple btn-apple-secondary">
                  hello@powerhouse.studio
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
