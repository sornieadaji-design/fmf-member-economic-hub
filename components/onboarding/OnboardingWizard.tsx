"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatNGN } from "@/lib/utils/format";
import { TIERS, PAYMENT_FREQUENCIES, FMF_BANK_DETAILS, ONBOARDING_STEPS } from "@/lib/constants/onboarding";
import {
  registrationSchema,
  profileSchema,
  participationSchema,
  kycSchema,
  tierSchema,
  initialContributionSchema,
  type ParticipationOption,
  type MembershipCategory,
  type Tier,
  type PaymentFrequency,
} from "@/lib/validation/onboarding";
import { uploadMemberFile } from "@/lib/actions/uploads";
import {
  saveRegistration,
  saveProfile,
  saveParticipation,
  submitKyc,
  acceptConsent,
  selectTier,
  skipTier,
  recordInitialContribution,
  finishOnboarding,
  type ActionResult,
} from "@/lib/actions/onboarding";

export interface WizardInitialData {
  fullName: string;
  phone: string;
  participationOption: ParticipationOption;
  membershipCategory: MembershipCategory;
  tier: Tier;
  paymentFrequency: PaymentFrequency;
  monthlyContribution: number;
  kycStatus: string;
  kycDocumentUrl: string | null;
  consentAccepted: boolean;
  onboardingStatus: string;
  fmfMemberId: string | null;
  hasInitialContribution: boolean;
}

const PARTICIPATION_OPTIONS: { value: ParticipationOption; label: string; blurb: string }[] = [
  { value: "cooperative", label: "Cooperative only", blurb: "Savings, welfare and credit." },
  { value: "investment", label: "Investment only", blurb: "Opt-in collective investment." },
  { value: "both", label: "Both", blurb: "Cooperative and investment." },
  { value: "information_only", label: "Information only", blurb: "Stay informed for now; no contributions." },
];

const MEMBERSHIP_CATEGORIES: { value: MembershipCategory; label: string }[] = [
  { value: "founding", label: "Founding member" },
  { value: "active", label: "Active member" },
  { value: "associate", label: "Associate member" },
  { value: "honorary", label: "Honorary member" },
];

/** First incomplete step index, derived from the persisted onboarding_status. */
function resumeStep(status: string, participation: ParticipationOption): number {
  switch (status) {
    case "registered":
      return 1; // register
    case "profile_complete":
      return 4; // kyc
    case "kyc_complete":
      return 5; // consent
    case "consented":
      return participation === "information_only" ? 8 : 6; // tier, or skip to member_id
    case "tier_selected":
      return participation === "information_only" ? 8 : 7; // contribution, or member_id
    case "active":
      return 10; // finish/done
    default:
      return 0;
  }
}

export function OnboardingWizard({ initial }: { initial: WizardInitialData }) {
  const router = useRouter();
  const [step, setStep] = React.useState(() =>
    resumeStep(initial.onboardingStatus, initial.participationOption),
  );
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Local form state (seeded from persisted values so the wizard is resumable).
  const [fullName, setFullName] = React.useState(initial.fullName);
  const [phone, setPhone] = React.useState(initial.phone);
  const [participation, setParticipation] = React.useState<ParticipationOption>(
    initial.participationOption,
  );
  const [membership, setMembership] = React.useState<MembershipCategory>(initial.membershipCategory);
  const [kycUrl, setKycUrl] = React.useState<string | null>(initial.kycDocumentUrl);
  const [uploading, setUploading] = React.useState(false);
  const [consent, setConsent] = React.useState(initial.consentAccepted);
  const [tier, setTier] = React.useState<Exclude<Tier, "none">>(
    initial.tier === "none" ? "standard" : initial.tier,
  );
  const [frequency, setFrequency] = React.useState<PaymentFrequency>(initial.paymentFrequency);
  const [paymentRef, setPaymentRef] = React.useState("");
  const [memberId, setMemberId] = React.useState<string | null>(initial.fmfMemberId);

  const isInfoOnly = participation === "information_only";
  const totalSteps = ONBOARDING_STEPS.length;

  function next(to?: number) {
    setError(null);
    setStep((s) => (to ?? s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  /** Run a server action inside a transition, advancing on success. */
  function run(action: () => Promise<ActionResult>, onOk: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) onOk();
      else setError(res.error);
    });
  }

  function clientError(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: unknown): boolean {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error!.issues[0]?.message ?? "Invalid input.");
      return true;
    }
    return false;
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", "kyc");
    const res = await uploadMemberFile(fd);
    setUploading(false);
    if (res.ok) setKycUrl(res.url);
    else setError(res.error);
  }

  const stepName = ONBOARDING_STEPS[step]!;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
          <span className="capitalize">{stepName.replace("_", " ")}</span>
        </div>
        <Progress value={((step + 1) / totalSteps) * 100} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">{TITLES[stepName]}</CardTitle>
          {SUBTITLES[stepName] ? <CardDescription>{SUBTITLES[stepName]}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1 — Welcome */}
          {stepName === "welcome" && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Welcome to the FMF Coop &amp; Investment Club. This short setup registers you as a
                member. Every financial action here is recorded, approved and auditable.
              </p>
              <p className="text-xs">Investments carry risk. Returns are not guaranteed.</p>
            </div>
          )}

          {/* 2 — Register */}
          {stepName === "register" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              </div>
            </div>
          )}

          {/* 3 — Profile */}
          {stepName === "profile" && (
            <RadioList
              name="membership"
              value={membership}
              onChange={(v) => setMembership(v as MembershipCategory)}
              options={MEMBERSHIP_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          )}

          {/* 4 — Participation */}
          {stepName === "participation" && (
            <RadioList
              name="participation"
              value={participation}
              onChange={(v) => setParticipation(v as ParticipationOption)}
              options={PARTICIPATION_OPTIONS.map((o) => ({ value: o.value, label: o.label, blurb: o.blurb }))}
            />
          )}

          {/* 5 — KYC */}
          {stepName === "kyc" && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Upload a valid ID (e.g. NIN slip, driver&apos;s licence or passport). Only you and
                authorised officers can see it.
              </p>
              <Input type="file" accept="image/*,application/pdf" onChange={onPickFile} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {kycUrl && <p className="text-xs text-primary">Document uploaded ✓</p>}
            </div>
          )}

          {/* 6 — Consent */}
          {stepName === "consent" && (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-muted-foreground">
                I have read and accept the Society&apos;s rules, the privacy notice and the code of
                conduct, and I understand that investments carry risk and returns are not guaranteed.
              </span>
            </label>
          )}

          {/* 7 — Tier */}
          {stepName === "tier" && (
            <div className="space-y-4">
              <RadioList
                name="tier"
                value={tier}
                onChange={(v) => setTier(v as Exclude<Tier, "none">)}
                options={TIERS.map((t) => ({
                  value: t.value,
                  label: `${t.label} — ${formatNGN(t.monthlyContribution)}/mo`,
                  blurb: t.blurb,
                }))}
              />
              <div className="space-y-1.5">
                <Label>Payment frequency</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_FREQUENCIES.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      size="sm"
                      variant={frequency === f.value ? "default" : "outline"}
                      onClick={() => setFrequency(f.value)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8 — Initial contribution */}
          {stepName === "contribution" && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="font-medium">Transfer to the FMF account, then enter your reference.</p>
                <dl className="mt-2 space-y-1 text-muted-foreground">
                  <div className="flex justify-between"><dt>Bank</dt><dd>{FMF_BANK_DETAILS.bankName}</dd></div>
                  <div className="flex justify-between"><dt>Account name</dt><dd>{FMF_BANK_DETAILS.accountName}</dd></div>
                  <div className="flex justify-between"><dt>Account number</dt><dd>{FMF_BANK_DETAILS.accountNumber}</dd></div>
                  <div className="flex justify-between"><dt>Amount</dt><dd>{formatNGN(initial.monthlyContribution || TIERS.find((t) => t.value === tier)?.monthlyContribution || 0)}</dd></div>
                </dl>
                <p className="mt-2 text-xs">No payment is taken in the app. An officer confirms your transfer.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref">Transfer reference</Label>
                <Input id="ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. your bank transaction ref" />
              </div>
            </div>
          )}

          {/* 9 — Member ID (assigned on finish) */}
          {stepName === "member_id" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {memberId ? (
                <p>
                  Your FMF Member ID is <strong className="text-foreground">{memberId}</strong>.
                </p>
              ) : (
                <p>
                  When you finish, you&apos;ll be issued a permanent FMF Member ID (format{" "}
                  <span className="font-mono">FMF-0000</span>) that identifies you across the Society.
                </p>
              )}
            </div>
          )}

          {/* 10 — Orientation */}
          {stepName === "orientation" && (
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Your savings, welfare, investment and registration funds are tracked separately.</li>
              <li>Loans and large payouts need two different officers to approve — no one acts alone.</li>
              <li>You confirm nothing about your own payments; an officer does.</li>
              <li>Investments carry risk. Returns are never guaranteed.</li>
            </ul>
          )}

          {/* 11 — Finish */}
          {stepName === "finish" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {initial.onboardingStatus === "active" ? (
                <p>
                  You&apos;re all set{memberId ? <> — Member ID <strong className="text-foreground">{memberId}</strong></> : null}.
                </p>
              ) : (
                <p>Finish to activate your membership and go to your dashboard.</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={pending || step === 0}>
          Back
        </Button>
        {renderPrimary()}
      </div>
    </div>
  );

  function renderPrimary() {
    switch (stepName) {
      case "welcome":
        return <Button onClick={() => next()}>Get started</Button>;

      case "register":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              const value = { fullName: fullName.trim(), phone: phone.trim() };
              if (clientError(registrationSchema, value)) return;
              run(() => saveRegistration(value), () => next());
            }}
          >
            {pending ? "Saving…" : "Continue"}
          </Button>
        );

      case "profile":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              const value = { membershipCategory: membership };
              if (clientError(profileSchema, value)) return;
              run(() => saveProfile(value), () => next());
            }}
          >
            {pending ? "Saving…" : "Continue"}
          </Button>
        );

      case "participation":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              const value = { participationOption: participation };
              if (clientError(participationSchema, value)) return;
              run(() => saveParticipation(value), () => next());
            }}
          >
            {pending ? "Saving…" : "Continue"}
          </Button>
        );

      case "kyc":
        return (
          <Button
            disabled={pending || uploading}
            onClick={() => {
              if (!kycUrl) {
                setError("Please upload your ID document to continue.");
                return;
              }
              const value = { documentUrl: kycUrl };
              if (clientError(kycSchema, value)) return;
              run(() => submitKyc(value), () => next());
            }}
          >
            {pending ? "Saving…" : "Continue"}
          </Button>
        );

      case "consent":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              if (!consent) {
                setError("You must accept the rules to continue.");
                return;
              }
              run(() => acceptConsent({ accept: true }), () =>
                next(isInfoOnly ? 8 : 6),
              );
            }}
          >
            {pending ? "Saving…" : "Accept & continue"}
          </Button>
        );

      case "tier":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              const value = { tier, paymentFrequency: frequency };
              if (clientError(tierSchema, value)) return;
              run(() => selectTier(value), () => next());
            }}
          >
            {pending ? "Saving…" : "Continue"}
          </Button>
        );

      case "contribution":
        return (
          <Button
            disabled={pending}
            onClick={() => {
              const value = { paymentReference: paymentRef.trim(), receiptUrl: "" };
              if (clientError(initialContributionSchema, value)) return;
              run(() => recordInitialContribution(value), () => next());
            }}
          >
            {pending ? "Recording…" : "Record & continue"}
          </Button>
        );

      case "member_id":
        return <Button onClick={() => next()}>Continue</Button>;

      case "orientation":
        return <Button onClick={() => next()}>Continue</Button>;

      case "finish":
        if (initial.onboardingStatus === "active") {
          return <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>;
        }
        return (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await finishOnboarding();
                if (res.ok) {
                  setMemberId(res.fmfMemberId);
                  router.push("/dashboard");
                } else {
                  setError(res.error);
                }
              })
            }
          >
            {pending ? "Finishing…" : "Finish & activate"}
          </Button>
        );

      // Info-only members reach member_id from consent (skipping tier + contribution).
      default:
        return <Button onClick={() => next()}>Continue</Button>;
    }
  }
}

/** A minimal accessible radio list (no Radix dependency). */
function RadioList({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; blurb?: string }[];
}) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <label
            key={o.value}
            className={
              "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm " +
              (selected ? "border-primary ring-1 ring-primary" : "border-input")
            }
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-medium">{o.label}</span>
              {o.blurb ? <span className="block text-muted-foreground">{o.blurb}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const TITLES: Record<string, string> = {
  welcome: "Welcome",
  register: "Register",
  profile: "Your membership",
  participation: "How you'll participate",
  kyc: "Verify your identity",
  consent: "Rules & consent",
  tier: "Choose a contribution tier",
  contribution: "Initial contribution",
  member_id: "Your Member ID",
  orientation: "How the Society works",
  finish: "Finish",
};

const SUBTITLES: Record<string, string> = {
  register: "Tell us who you are.",
  profile: "Select your membership category.",
  participation: "You can change this later with an officer.",
  tier: "Indicative amounts — set by the General Assembly.",
  contribution: "Record your transfer reference. No money moves in the app.",
};
