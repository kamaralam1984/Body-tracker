"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, ImagePlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { SettingsSaveBar } from "@/features/settings";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  role: z.string().min(2, "Role must be at least 2 characters"),
  bio: z.string().max(280, "Bio can be at most 280 characters").optional(),
  username: z
    .string()
    .optional()
    .refine((v) => !v || /^[a-zA-Z0-9-]+$/.test(v), "Only letters, numbers, and dashes allowed"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultValues: ProfileFormValues = {
  fullName: "Jordan Rivera",
  email: "jordan@example.com",
  phone: "",
  role: "Performance Coach",
  bio: "",
  username: "jordan-rivera",
  company: "Acme Athletics",
  jobTitle: "Lead Performance Coach",
  socialLinks: {
    twitter: "",
    linkedin: "",
    website: "",
  },
};

export default function ProfileSettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const preview = useWatch({ control });

  function onSubmit(values: ProfileFormValues) {
    toast.success("Profile updated");
    reset(values);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cover image</CardTitle>
          <CardDescription>Shown at the top of your public profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-border bg-muted flex aspect-[3/1] flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <ImagePlus className="text-muted-foreground size-6" strokeWidth={1.5} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.info("Image upload isn't wired to a backend yet")}
            >
              Upload cover image
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
          <CardDescription>
            This is displayed across the workspace and on your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar fallback={preview.fullName || "Jordan Rivera"} size="xl" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.info("Image upload isn't wired to a backend yet")}
              >
                <Camera />
                Upload new photo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Image upload isn't wired to a backend yet")}
              >
                Remove
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">JPG, PNG or GIF. Max size 4MB.</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Update your name, contact details, and bio.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="full-name" error={errors.fullName?.message}>
              <Input id="full-name" {...register("fullName")} invalid={!!errors.fullName} />
            </FormField>
            <FormField label="Email address" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register("email")} invalid={!!errors.email} />
            </FormField>
            <FormField
              label="Phone number"
              htmlFor="phone"
              hint="Optional"
              error={errors.phone?.message}
            >
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" {...register("phone")} />
            </FormField>
            <FormField label="Role" htmlFor="role" error={errors.role?.message}>
              <Input id="role" {...register("role")} invalid={!!errors.role} />
            </FormField>
            <FormField
              label="Username"
              htmlFor="username"
              hint="Optional"
              error={errors.username?.message}
            >
              <Input id="username" {...register("username")} invalid={!!errors.username} />
            </FormField>
            <FormField
              label="Company"
              htmlFor="company"
              hint="Optional"
              error={errors.company?.message}
            >
              <Input id="company" {...register("company")} />
            </FormField>
            <FormField
              label="Job title"
              htmlFor="job-title"
              hint="Optional"
              error={errors.jobTitle?.message}
            >
              <Input id="job-title" {...register("jobTitle")} />
            </FormField>
            <FormField
              label="Bio"
              htmlFor="bio"
              className="sm:col-span-2"
              hint="Shown on your public profile."
              error={errors.bio?.message}
            >
              <Textarea
                id="bio"
                placeholder="Tell your team a little about yourself…"
                {...register("bio")}
                invalid={!!errors.bio}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
            <CardDescription>Optional links shown alongside your profile.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Twitter / X" htmlFor="twitter" hint="Optional">
              <Input id="twitter" placeholder="@handle" {...register("socialLinks.twitter")} />
            </FormField>
            <FormField label="LinkedIn" htmlFor="linkedin" hint="Optional">
              <Input
                id="linkedin"
                placeholder="linkedin.com/in/…"
                {...register("socialLinks.linkedin")}
              />
            </FormField>
            <FormField label="Website" htmlFor="website" hint="Optional">
              <Input id="website" placeholder="https://…" {...register("socialLinks.website")} />
            </FormField>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => reset()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile preview</CardTitle>
            <CardDescription>How your identity appears elsewhere in the app.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar fallback={preview.fullName || "?"} size="lg" status="online" />
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">{preview.fullName || "—"}</span>
              <span className="text-muted-foreground text-xs">
                {[preview.role, preview.company].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <SettingsSaveBar
          visible={isDirty}
          saving={isSubmitting}
          onSave={handleSubmit(onSubmit)}
          onDiscard={() => reset()}
        />
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="danger" title="Delete account">
            Permanently remove your account and all associated data. This action cannot be undone.
          </Alert>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="danger" size="sm">
            Delete account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
