"use client";

import { Reveal } from "@/components/ui/reveal";
import { LinkedInLink } from "@/components/icons/linkedin";
import { SectionScenery } from "@/components/section-scenery";

const team = [
  {
    name: "Shreyas Sinha",
    degree: "Civil Engineering",
    initial: "S",
    hue: "bg-blue-500/25 text-blue-200",
    linkedin: "https://www.linkedin.com/in/shreyas-sinha-0288b7251/",
  },
  {
    name: "Siddhant Gada",
    degree: "Mechanical Engineering",
    initial: "S",
    hue: "bg-violet-500/25 text-violet-200",
    linkedin: "https://www.linkedin.com/in/siddhantgada7/",
  },
  {
    name: "Aymaan Shahzad",
    degree: "Energy Science and Engineering",
    initial: "A",
    hue: "bg-cyan-500/25 text-cyan-200",
    linkedin: "https://www.linkedin.com/in/aymaanshahzad23/",
  },
  {
    name: "Anubhav Agrawal",
    degree: "Mechanical Engineering",
    initial: "A",
    hue: "bg-amber-500/25 text-amber-200",
    linkedin: "https://www.linkedin.com/in/anubhavagr1/",
  },
];

export function Team() {
  return (
    <section id="team" className="section-pad relative overflow-hidden border-t border-white/[0.06]">
      <SectionScenery variant="nodes" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
        <Reveal>
          <p className="section-eyebrow">Founding team</p>
          <h2 className="section-headline mt-3">Built by operators who ship.</h2>
          <p className="section-body mt-3 max-w-lg">
            IIT Bombay · B.Tech Class of 2026 — engineers who build automation systems, not slide decks.
          </p>
        </Reveal>

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
          <div className="hidden border-b border-white/[0.06] bg-white/[0.03] px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white/35 md:grid md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-8">
            <span className="w-12" />
            <span>Founder</span>
            <span className="text-right">Connect</span>
          </div>
          {team.map((person, i) => (
            <Reveal key={person.name} delay={i * 0.05}>
              <div className="group flex flex-col gap-4 border-b border-white/[0.06] px-6 py-6 transition-colors last:border-b-0 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-6 md:px-8 md:py-7">
                <div className="flex items-start gap-5 sm:flex-1">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold ring-1 ring-white/10 ${person.hue}`}
                  >
                    {person.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold tracking-tight text-white">{person.name}</p>
                    <p className="mt-0.5 text-[14px] font-medium text-[#2997ff]/80">Founding Team</p>
                    <p className="mt-2 font-mono text-[12px] leading-relaxed text-white/40 md:text-[13px]">
                      <span className="text-[#2997ff]/90">IIT Bombay</span>
                      <span className="text-white/25"> · </span>
                      {person.degree}
                      <span className="text-white/25"> · </span>
                      <span className="text-white/50">B.Tech Class of 2026</span>
                    </p>
                  </div>
                </div>
                <LinkedInLink
                  href={person.linkedin}
                  label={`${person.name} on LinkedIn`}
                  className="self-start sm:self-center"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
