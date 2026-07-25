"use client";

import { useState } from "react";
import {
  Activity,
  ArrowUp,
  BookOpen,
  Bell,
  CreditCard,
  Download,
  Gauge,
  Home,
  Mail,
  Plus,
  Settings,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AnalyticsCard,
  Avatar,
  AvatarGroup,
  AvatarUpload,
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Calendar,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  CircularProgress,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CounterTextarea,
  CurrencyInput,
  DataTable,
  DatePicker,
  DateRangePicker,
  Drawer,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  FeatureCard,
  FloatingActionButton,
  Input,
  Label,
  LoadingCard,
  MediaCard,
  MetricCard,
  Modal,
  MultiSelect,
  NoDataEmptyState,
  NoInternetEmptyState,
  NoPermissionEmptyState,
  NoResultsEmptyState,
  MaintenanceEmptyState,
  OtpInput,
  Pagination,
  PasswordInput,
  PhoneInput,
  Popover,
  ProfileCard,
  Progress,
  RadioGroup,
  RadioGroupItem,
  SearchInput,
  SelectableCard,
  Select,
  Skeleton,
  Spinner,
  SplitButton,
  StatTile,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Timeline,
  TimelineItem,
  Tooltip,
  TrendCard,
  toast,
} from "@/components/ui";
import {
  ChartArea,
  ChartBar,
  ChartDonut,
  ChartLine,
  ChartPie,
  ChartRadar,
} from "@/components/ui/charts";
import type { DateRange } from "@/components/ui/date-range-picker";

const sections = [
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Inputs & Forms" },
  { id: "selection", label: "Selection" },
  { id: "cards", label: "Cards" },
  { id: "data", label: "Data Display" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "navigation", label: "Navigation" },
  { id: "progress", label: "Progress & Loading" },
  { id: "dates", label: "Date & Time" },
  { id: "charts", label: "Charts" },
  { id: "empty", label: "Empty States" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Card>
  );
}

const chartData = [
  { month: "Jan", sessions: 120, score: 78 },
  { month: "Feb", sessions: 145, score: 80 },
  { month: "Mar", sessions: 138, score: 82 },
  { month: "Apr", sessions: 162, score: 85 },
  { month: "May", sessions: 178, score: 87 },
  { month: "Jun", sessions: 190, score: 89 },
];

const pieData = [
  { name: "Strength", value: 38 },
  { name: "Mobility", value: 27 },
  { name: "Cardio", value: 21 },
  { name: "Recovery", value: 14 },
];

const radarData = [
  { metric: "Strength", current: 82, previous: 68 },
  { metric: "Mobility", current: 74, previous: 70 },
  { metric: "Endurance", current: 88, previous: 75 },
  { metric: "Balance", current: 65, previous: 60 },
  { metric: "Recovery", current: 79, previous: 66 },
];

interface SampleRow {
  id: string;
  member: string;
  type: string;
  score: number;
  date: string;
}

const sampleRows: SampleRow[] = [
  { id: "1", member: "Sarah Chen", type: "Mobility", score: 92, date: "Jul 24, 2026" },
  { id: "2", member: "Marcus Webb", type: "Strength", score: 88, date: "Jul 23, 2026" },
  { id: "3", member: "Priya Nair", type: "Cardio", score: 79, date: "Jul 22, 2026" },
  { id: "4", member: "Diego Alvarez", type: "Recovery", score: 65, date: "Jul 21, 2026" },
  { id: "5", member: "Elena Kowalski", type: "Strength", score: 95, date: "Jul 20, 2026" },
];

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [multiValue, setMultiValue] = useState<string[]>(["strength"]);
  const [date, setDate] = useState<Date | undefined>();
  const [range, setRange] = useState<DateRange | undefined>();
  const [otp, setOtp] = useState("");
  const [plan, setPlan] = useState("team");
  const [amount, setAmount] = useState<number | undefined>(249);
  const [bio, setBio] = useState("");
  const [radioValue, setRadioValue] = useState("email");
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col gap-10 pb-24">
      <PageHeader
        title="Design System"
        description="Every reusable component in the Body Tracker design system, in one place."
      />

      <nav className="border-border bg-background/80 sticky top-14 z-20 -mx-1 flex flex-wrap gap-1.5 overflow-x-auto border-b px-1 py-3 backdrop-blur-md">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <Section
        id="buttons"
        title="Buttons"
        description="Variants, sizes, groups, and composed actions."
      >
        <Demo label="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
        </Demo>
        <Demo label="Sizes & states">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Settings">
            <Settings />
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button>
            <Plus />
            With icon
          </Button>
        </Demo>
        <Demo label="Button group & split button">
          <ButtonGroup>
            <Button variant="outline">Day</Button>
            <Button variant="outline">Week</Button>
            <Button variant="outline">Month</Button>
          </ButtonGroup>
          <SplitButton
            label="Publish"
            menu={
              <>
                <DropdownMenuItem>Schedule for later</DropdownMenuItem>
                <DropdownMenuItem>Save as draft</DropdownMenuItem>
              </>
            }
          />
        </Demo>
      </Section>

      <Section
        id="forms"
        title="Inputs & Forms"
        description="Text inputs and their specialized presets."
      >
        <Demo label="Base inputs">
          <Input placeholder="Text input" className="w-48" />
          <Input placeholder="Invalid" invalid className="w-48" />
          <Input placeholder="Disabled" disabled className="w-48" />
          <Input placeholder="With icon" startIcon={<Mail />} className="w-48" />
        </Demo>
        <Demo label="Specialized inputs">
          <PasswordInput placeholder="Password" className="w-48" />
          <SearchInput placeholder="Search…" className="w-48" />
          <PhoneInput className="w-48" />
          <CurrencyInput value={amount} onChange={setAmount} className="w-40" />
        </Demo>
        <Demo label="OTP input">
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={() => toast.success("Code verified")}
          />
        </Demo>
        <Demo label="Textarea & counter">
          <Textarea placeholder="Plain textarea" className="w-64" />
          <CounterTextarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={120}
            className="w-64"
          />
        </Demo>
        <Demo label="Select & multi-select">
          <Select
            options={[
              { value: "strength", label: "Strength" },
              { value: "mobility", label: "Mobility" },
              { value: "cardio", label: "Cardio" },
            ]}
            value={multiValue[0]}
            onValueChange={(v) => setMultiValue([v])}
            className="w-44"
          />
          <MultiSelect
            options={[
              { value: "strength", label: "Strength" },
              { value: "mobility", label: "Mobility" },
              { value: "cardio", label: "Cardio" },
              { value: "recovery", label: "Recovery" },
            ]}
            value={multiValue}
            onValueChange={setMultiValue}
            placeholder="Filter categories…"
            className="w-56"
          />
        </Demo>
      </Section>

      <Section
        id="selection"
        title="Selection controls"
        description="Checkbox, radio, switch, and selectable cards."
      >
        <Demo label="Checkbox, radio, switch">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              id="ds-checkbox"
            />
            <Label htmlFor="ds-checkbox">Accept terms</Label>
          </div>
          <RadioGroup value={radioValue} onValueChange={setRadioValue} className="flex-row gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="email" id="ds-email" />
              <Label htmlFor="ds-email">Email</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sms" id="ds-sms" />
              <Label htmlFor="ds-sms">SMS</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} id="ds-switch" />
            <Label htmlFor="ds-switch">Notifications</Label>
          </div>
        </Demo>
        <Demo label="Selectable cards">
          <SelectableCard
            title="Starter"
            description="For individuals"
            icon={Gauge}
            selected={plan === "starter"}
            onSelect={() => setPlan("starter")}
            className="w-52"
          />
          <SelectableCard
            title="Team"
            description="For growing teams"
            icon={Users}
            selected={plan === "team"}
            onSelect={() => setPlan("team")}
            className="w-52"
          />
        </Demo>
      </Section>

      <Section
        id="cards"
        title="Cards"
        description="Composed card variants for common enterprise layouts."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Active members" value="342" icon={Users} />
          <TrendCard label="Churn rate" value="2.1%" direction="down" changeLabel="-0.4pt" />
          <StatTile
            label="Total sessions"
            value="1,284"
            delta={{ value: "+12.4%", direction: "up" }}
            trend={[12, 18, 14, 22, 19, 26, 24, 30]}
            icon={Activity}
          />
          <ProfileCard
            name="Jordan Rivera"
            role="Performance Coach"
            stats={[
              { label: "Sessions", value: "428" },
              { label: "Avg score", value: "91.4" },
            ]}
          />
          <FeatureCard
            icon={BookOpen}
            title="Documentation"
            description="Guides for every feature."
          />
          <MediaCard
            imageSrc="/next.svg"
            imageAlt="Preview"
            badge="New"
            title="Weekly report"
            description="Auto-generated every Monday."
          />
          <LoadingCard />
        </div>
        <AnalyticsCard
          title="Sessions this week"
          description="Volume across the team"
          action={<Badge variant="accent">+18.2%</Badge>}
        >
          <ChartBar data={chartData} xKey="month" dataKeys={["sessions"]} height={200} />
        </AnalyticsCard>
      </Section>

      <Section
        id="data"
        title="Data display"
        description="Tables, avatars, timelines, and pagination."
      >
        <Demo label="Avatars">
          <Avatar fallback="Jordan Rivera" status="online" />
          <Avatar fallback="Sarah Chen" size="lg" status="away" />
          <AvatarGroup max={3}>
            <Avatar fallback="Sarah Chen" />
            <Avatar fallback="Marcus Webb" />
            <Avatar fallback="Priya Nair" />
            <Avatar fallback="Diego Alvarez" />
            <Avatar fallback="Elena Kowalski" />
          </AvatarGroup>
          <AvatarUpload
            fallback="Jordan Rivera"
            onFileSelect={() => toast.success("Photo selected")}
          />
        </Demo>

        <Card>
          <CardHeader>
            <CardTitle>Basic table</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.slice(0, 3).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.member}</TableCell>
                    <TableCell className="text-muted-foreground">{row.type}</TableCell>
                    <TableCell className="font-medium">{row.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DataTable — sortable, searchable, selectable, paginated</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4 sm:p-6">
            <DataTable
              data={sampleRows}
              getRowId={(row) => row.id}
              searchable
              searchKeys={(row) => `${row.member} ${row.type}`}
              selectable
              pageSize={5}
              columns={[
                { key: "member", header: "Member", render: (row) => row.member, sortable: true },
                { key: "type", header: "Type", render: (row) => row.type, sortable: true },
                {
                  key: "score",
                  header: "Score",
                  render: (row) => row.score,
                  sortable: true,
                  align: "right",
                },
                { key: "date", header: "Date", render: (row) => row.date },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline>
              <TimelineItem
                variant="success"
                title="Session completed"
                description="Sarah Chen finished a mobility assessment."
                timestamp="12m ago"
              />
              <TimelineItem
                variant="accent"
                title="Member joined"
                description="Alex Kim joined the workspace."
                timestamp="1h ago"
              />
              <TimelineItem
                variant="warning"
                title="Session flagged"
                description="Form deviation detected."
                timestamp="3h ago"
              />
            </Timeline>
          </CardContent>
        </Card>

        <Demo label="Breadcrumb & pagination">
          <Breadcrumb
            items={[
              { label: "Home", href: "#" },
              { label: "Design System", href: "#" },
              { label: "Data" },
            ]}
          />
          <Pagination page={page} totalPages={6} onPageChange={setPage} />
        </Demo>
      </Section>

      <Section id="feedback" title="Feedback" description="Alerts, toasts, and status badges.">
        <Demo label="Alerts">
          <Alert variant="success" title="Saved" className="max-w-sm">
            Your changes have been saved.
          </Alert>
          <Alert variant="danger" title="Something went wrong" className="max-w-sm">
            Please try again.
          </Alert>
        </Demo>
        <Demo label="Badges">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </Demo>
        <Demo label="Toasts — mounted globally via ToastProvider in the root layout">
          <Button variant="outline" onClick={() => toast.success("Session saved")}>
            Success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Failed to save session")}>
            Error
          </Button>
          <Button variant="outline" onClick={() => toast.warning("Storage almost full")}>
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
                loading: "Generating report…",
                success: "Report ready",
                error: "Generation failed",
              })
            }
          >
            Promise
          </Button>
        </Demo>
      </Section>

      <Section
        id="overlays"
        title="Overlays"
        description="Modal, drawer, popover, tooltip, accordion, and command palette."
      >
        <Demo label="Modal & drawer">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
        </Demo>
        <Demo label="Popover, tooltip, dropdown">
          <Popover trigger={<Button variant="outline">Popover</Button>}>
            <p className="text-foreground p-2 text-sm">Popover content.</p>
          </Popover>
          <Tooltip content="Helpful tooltip">
            <Button variant="outline">Hover me</Button>
          </Tooltip>
          <DropdownMenu trigger={<Button variant="outline">Dropdown</Button>}>
            <DropdownMenuItem icon={Home}>Dashboard</DropdownMenuItem>
            <DropdownMenuItem icon={Bell}>Notifications</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Settings}>Settings</DropdownMenuItem>
          </DropdownMenu>
        </Demo>

        <Card>
          <CardHeader>
            <CardTitle>Accordion</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is included?</AccordionTrigger>
                <AccordionContent>
                  Everything you need to get started, from onboarding to reporting.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Can I change plans later?</AccordionTrigger>
                <AccordionContent>
                  Yes, upgrade or downgrade at any time from Settings → Billing.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Command palette</CardTitle>
          </CardHeader>
          <CardContent>
            <Command className="max-w-md">
              <CommandInput placeholder="Search pages…" />
              <CommandList>
                <CommandEmpty />
                <CommandGroup heading="Pages">
                  <CommandItem
                    value="Dashboard"
                    icon={Home}
                    onSelect={() => toast.info("Navigate to Dashboard")}
                  >
                    Dashboard
                  </CommandItem>
                  <CommandItem
                    value="Settings"
                    icon={Settings}
                    onSelect={() => toast.info("Navigate to Settings")}
                  >
                    Settings
                  </CommandItem>
                  <CommandItem
                    value="Billing"
                    icon={CreditCard}
                    onSelect={() => toast.info("Navigate to Billing")}
                  >
                    Billing
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </CardContent>
        </Card>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm action"
          description="This is a standard confirm modal."
        >
          <p className="text-muted-foreground text-sm">Are you sure you want to proceed?</p>
          <CardFooter className="justify-end p-0 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
          </CardFooter>
        </Modal>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Drawer"
          description="Slides in from the right."
        >
          <p className="text-muted-foreground text-sm">Drawer content goes here.</p>
        </Drawer>
      </Section>

      <Section
        id="navigation"
        title="Navigation"
        description="Tabs for switching between related views."
      >
        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <p className="text-muted-foreground text-sm">Overview panel content.</p>
              </TabsContent>
              <TabsContent value="activity">
                <p className="text-muted-foreground text-sm">Activity panel content.</p>
              </TabsContent>
              <TabsContent value="settings">
                <p className="text-muted-foreground text-sm">Settings panel content.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Section>

      <Section
        id="progress"
        title="Progress & loading"
        description="Linear, circular, stepper, and skeleton states."
      >
        <Demo label="Linear progress">
          <Progress value={72} showValue className="w-48" />
          <Progress value={40} variant="success" className="w-48" />
          <Progress indeterminate className="w-48" />
        </Demo>
        <Demo label="Circular progress">
          <CircularProgress value={72} showValue size={56} />
          <CircularProgress value={40} variant="warning" size={56} />
          <CircularProgress indeterminate size={32} />
        </Demo>
        <Card>
          <CardHeader>
            <CardTitle>Stepper</CardTitle>
          </CardHeader>
          <CardContent>
            <Stepper
              currentStep={1}
              steps={[
                { label: "Account", description: "Create your account" },
                { label: "Workspace", description: "Set up your team" },
                { label: "Billing", description: "Choose a plan" },
              ]}
            />
          </CardContent>
        </Card>
        <Demo label="Skeleton & spinner">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-10 rounded-full" />
          <Spinner />
        </Demo>
      </Section>

      <Section
        id="dates"
        title="Date & time"
        description="Calendar, date picker, and range picker."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-3">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </Card>
          <div className="flex flex-col gap-3">
            <DatePicker value={date} onChange={setDate} placeholder="Due date" />
            <DateRangePicker value={range} onChange={setRange} placeholder="Select a date range" />
          </div>
        </div>
      </Section>

      <Section id="charts" title="Charts" description="Recharts-based enterprise chart set.">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AnalyticsCard title="Line" description="Session trend">
            <ChartLine data={chartData} xKey="month" dataKeys={["sessions"]} />
          </AnalyticsCard>
          <AnalyticsCard title="Area" description="Score trend">
            <ChartArea data={chartData} xKey="month" dataKeys={["score"]} />
          </AnalyticsCard>
          <AnalyticsCard title="Bar" description="Sessions by month">
            <ChartBar data={chartData} xKey="month" dataKeys={["sessions"]} />
          </AnalyticsCard>
          <AnalyticsCard title="Radar" description="Current vs. previous period">
            <ChartRadar data={radarData} angleKey="metric" dataKeys={["current", "previous"]} />
          </AnalyticsCard>
          <AnalyticsCard title="Pie" description="Sessions by category">
            <ChartPie data={pieData} />
          </AnalyticsCard>
          <AnalyticsCard title="Donut" description="Sessions by category">
            <ChartDonut
              data={pieData}
              centerLabel={<span className="text-foreground text-lg font-semibold">100%</span>}
            />
          </AnalyticsCard>
        </div>
      </Section>

      <Section
        id="empty"
        title="Empty states"
        description="Named presets for common empty conditions."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <NoDataEmptyState />
          </Card>
          <Card>
            <NoResultsEmptyState />
          </Card>
          <Card>
            <NoInternetEmptyState />
          </Card>
          <Card>
            <NoPermissionEmptyState />
          </Card>
          <Card>
            <MaintenanceEmptyState />
          </Card>
          <Card>
            <EmptyState
              icon={Download}
              title="Custom empty state"
              description="Fully overridable via the base EmptyState component."
            />
          </Card>
        </div>
      </Section>

      <FloatingActionButton
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp />
      </FloatingActionButton>
    </div>
  );
}
