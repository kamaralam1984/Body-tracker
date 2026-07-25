import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Organization" };

export default function OrganizationSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization logo</CardTitle>
          <CardDescription>Shown in the sidebar and on shared reports.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="bg-muted flex size-16 items-center justify-center rounded-xl">
            <Building2 className="text-muted-foreground size-6" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Upload logo
              </Button>
              <Button variant="ghost" size="sm">
                Remove
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">SVG or PNG, at least 256×256px.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>General information about your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Organization name" htmlFor="org-name">
            <Input id="org-name" defaultValue="Body Tracker Performance Lab" />
          </FormField>
          <FormField label="Workspace URL" htmlFor="org-url">
            <Input id="org-url" defaultValue="bodytracker.app/performance-lab" />
          </FormField>
          <FormField label="Industry" htmlFor="org-industry">
            <Input id="org-industry" defaultValue="Sports Performance" />
          </FormField>
          <FormField label="Company size" htmlFor="org-size">
            <Input id="org-size" defaultValue="11–50 employees" />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
