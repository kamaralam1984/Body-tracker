import type { Metadata } from "next";
import { BookOpen, ChevronDown, LifeBuoy, MessageCircle, Search, Users, Video } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help" };

const resources = [
  {
    title: "Documentation",
    description: "Guides and references for every feature.",
    icon: BookOpen,
  },
  { title: "Video tutorials", description: "Short walkthroughs of common workflows.", icon: Video },
  {
    title: "Community forum",
    description: "Ask questions and share tips with other teams.",
    icon: Users,
  },
  {
    title: "Contact support",
    description: "Reach our team directly for account issues.",
    icon: LifeBuoy,
  },
];

const faqs = [
  {
    question: "How is a session score calculated?",
    answer:
      "Session scores combine movement quality, consistency, and completion rate into a single 0–100 metric, weighted per session type.",
  },
  {
    question: "Can I export reports to PDF or CSV?",
    answer:
      "Yes — every report on the Reports page can be downloaded as PDF or CSV from the row actions menu.",
  },
  {
    question: "How do I invite a new team member?",
    answer:
      "Go to Settings → Organization and use the invite panel to send an email invitation with a preset role.",
  },
  {
    question: "Where can I change notification preferences?",
    answer: "Notification channels and frequency can be managed under Settings → Notifications.",
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Help & support"
        description="Find answers, guides, and ways to reach our team."
      />

      <Input
        placeholder="Search articles, guides, and FAQs…"
        startIcon={<Search />}
        className="h-11 max-w-xl text-[15px]"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <Card
            key={resource.title}
            className="flex flex-col gap-3 p-5 transition-shadow duration-200 hover:shadow-md"
          >
            <div className="bg-muted flex size-9 items-center justify-center rounded-md">
              <resource.icon className="text-muted-foreground size-4" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-semibold">{resource.title}</p>
              <p className="text-muted-foreground text-sm">{resource.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <Card className="divide-border-subtle divide-y p-2">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-4 py-3">
              <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  strokeWidth={1.75}
                />
              </summary>
              <p className="text-muted-foreground pt-2.5 text-sm">{faq.answer}</p>
            </details>
          ))}
        </Card>
      </div>

      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <MessageCircle className="text-muted-foreground size-6" strokeWidth={1.75} />
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-base font-semibold">Still need help?</p>
          <p className="text-muted-foreground text-sm">
            Our support team typically responds within a few hours.
          </p>
        </div>
        <Button variant="primary" size="md" className="mt-1">
          Contact support
        </Button>
      </Card>
    </div>
  );
}
