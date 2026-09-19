"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAnnouncement, createResolution } from "@/lib/actions/admin/communications";
import { createAnnouncementSchema, createResolutionSchema } from "@/lib/validation/admin";
import { announcementCategory as catEnum, announcementAudience as audEnum } from "@/lib/validation/enums";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [category, setCategory] = React.useState<(typeof catEnum.options)[number]>(catEnum.options[0]);
  const [audience, setAudience] = React.useState<(typeof audEnum.options)[number]>(audEnum.options[0]);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function submit() {
    setError(null);
    setDone(false);
    const parsed = createAnnouncementSchema.safeParse({ title: title.trim(), body: body.trim(), category, audience, isPolicy: category === "policy" });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.");
    startTransition(async () => {
      const res = await createAnnouncement(parsed.data);
      if (res.ok) { setDone(true); setTitle(""); setBody(""); router.refresh(); } else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Post an announcement</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="a-title">Title</Label><Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="a-body">Body</Label><Textarea id="a-body" value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Category</Label>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {catEnum.options.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Audience</Label>
            <select className={selectClass} value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              {audEnum.options.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Announcement posted.</p>}
        <Button onClick={submit} disabled={pending}>{pending ? "Posting…" : "Post"}</Button>
      </CardContent>
    </Card>
  );
}

export function ResolutionForm() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [optionsText, setOptionsText] = React.useState("For, Against, Abstain");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function submit() {
    setError(null);
    setDone(false);
    const options = optionsText.split(",").map((s) => s.trim()).filter(Boolean);
    const parsed = createResolutionSchema.safeParse({ title: title.trim(), description: description.trim(), options });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.");
    startTransition(async () => {
      const res = await createResolution(parsed.data);
      if (res.ok) { setDone(true); setTitle(""); setDescription(""); router.refresh(); } else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Open a resolution</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="r-title">Title</Label><Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="r-desc">Description</Label><Textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="r-opts">Options (comma-separated)</Label><Input id="r-opts" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-primary">Resolution opened for voting.</p>}
        <Button onClick={submit} disabled={pending}>{pending ? "Opening…" : "Open resolution"}</Button>
      </CardContent>
    </Card>
  );
}
