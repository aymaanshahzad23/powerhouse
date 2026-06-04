import { InfiniteMarquee } from "@/components/ui/infinite-marquee";

const stack = [
  "n8n",
  "Claude AI",
  "HubSpot",
  "Slack",
  "WhatsApp API",
  "Notion",
  "Zapier",
  "Postgres",
  "Retool",
  "Mixpanel",
];

export function StackMarquee() {
  return (
    <section aria-label="Technology stack">
      <InfiniteMarquee items={stack} variant="default" speed="medium" direction="left" />
    </section>
  );
}
