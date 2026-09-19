import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { pool, db } from "@/lib/db";
import type { StaffRoleValue, UserRoleValue } from "./roles";

/**
 * NextAuth.js v5 (Auth.js) configuration.
 *
 * ⚠️ VERIFY BEFORE RELYING ON THIS: Auth.js v5 is still on a beta tag and its API
 * (adapter export shape, session/jwt callback signatures) has shifted between betas.
 * Confirm each of the following against the CURRENT docs at https://authjs.dev :
 *   - the `@auth/pg-adapter` default export and the SQL schema it expects (migrations/002);
 *   - whether a database session strategy (used here, via the adapter) exposes the
 *     `session` callback's `user` param as the adapter user row;
 *   - the exact way to surface `role`/`staff_role` on the session (callback vs. augmentation).
 *
 * Governance intent (does not change): every session must carry the member's coarse
 * `role` ('admin' | 'member') and their `staff_role`, so guards can enforce access.
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // Database sessions (the adapter persists them). Auth.js defaults to JWT when no
  // adapter is set; with the adapter, "database" is the natural choice for this app.
  session: { strategy: "database" },
  events: {
    /**
     * On first sign-in the adapter creates the users row; we create the matching FMF
     * member_profiles row (role='member', staff_role='member', onboarding_status='registered').
     * All other columns take their DB defaults. Onboarding then advances the status.
     */
    async createUser({ user }) {
      if (!user.id) return;
      await db
        .insertInto("member_profiles")
        .values({ user_id: user.id })
        .onConflict((oc) => oc.column("user_id").doNothing())
        .execute();
    },
  },
  callbacks: {
    /**
     * Attach the FMF role + staff_role + onboarding_status to the session.
     * We read them from member_profiles (created on first sign-in — Phase 4 wires the
     * event that inserts the profile row; until then a missing profile defaults to member).
     */
    async session({ session, user }) {
      if (session.user && user?.id) {
        const profile = await db
          .selectFrom("member_profiles")
          .select(["role", "staff_role", "onboarding_status", "fmf_member_id"])
          .where("user_id", "=", user.id)
          .executeTakeFirst();

        session.user.id = user.id;
        session.user.role = (profile?.role ?? "member") as UserRoleValue;
        session.user.staffRole = (profile?.staff_role ?? "member") as StaffRoleValue;
        session.user.onboardingStatus = profile?.onboarding_status ?? "registered";
        session.user.fmfMemberId = profile?.fmf_member_id ?? null;
      }
      return session;
    },
  },
  pages: {
    // signIn: "/signin",  // build a branded sign-in page in Phase 3/4 if desired
  },
});
