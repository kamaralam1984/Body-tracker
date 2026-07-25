import type { Metadata } from "next";
import { CreditCard, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Billing" };

const invoices = [
  { date: "Jul 1, 2026", amount: "$249.00", status: "Paid" },
  { date: "Jun 1, 2026", amount: "$249.00", status: "Paid" },
  { date: "May 1, 2026", amount: "$249.00", status: "Paid" },
  { date: "Apr 1, 2026", amount: "$199.00", status: "Paid" },
];

export default function BillingSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>You&apos;re on the Team plan, billed monthly.</CardDescription>
          </div>
          <Badge variant="accent">Team</Badge>
        </CardHeader>
        <CardContent className="flex items-baseline gap-1.5">
          <span className="text-foreground text-3xl font-semibold tracking-tight">$249</span>
          <span className="text-muted-foreground text-sm">/ month · up to 50 members</span>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="outline" size="sm">
            View plans
          </Button>
          <Button variant="primary" size="sm">
            Upgrade plan
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment method</CardTitle>
          <CardDescription>Used for your monthly subscription charge.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-md">
              <CreditCard className="text-muted-foreground size-4" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-foreground text-sm font-medium">Visa ending in 4242</p>
              <p className="text-muted-foreground text-xs">Expires 08/2029</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            Update
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing history</CardTitle>
          <CardDescription>Download past invoices.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.date}>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="font-medium">{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant="success">{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="Download invoice"
                      className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
                    >
                      <Download className="size-4" strokeWidth={1.75} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
