import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  LinkedInBioVariants,
  LinkedInProfileSessions,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(LinkedInProfileSessions)
    .where(and(eq(LinkedInProfileSessions.id, sessionId), eq(LinkedInProfileSessions.userId, userId)));

  if (!session) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Profile session not found.",
    });
  }

  return session;
}

async function getOwnedVariant(variantId: string, sessionId: string, userId: string) {
  await getOwnedSession(sessionId, userId);

  const [variant] = await db
    .select()
    .from(LinkedInBioVariants)
    .where(
      and(
        eq(LinkedInBioVariants.id, variantId),
        eq(LinkedInBioVariants.sessionId, sessionId)
      )
    );

  if (!variant) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Bio variant not found.",
    });
  }

  return variant;
}

export const server = {
  createProfileSession: defineAction({
    input: z.object({
      currentHeadline: z.string().optional(),
      currentAbout: z.string().optional(),
      currentTitle: z.string().optional(),
      industry: z.string().optional(),
      location: z.string().optional(),
      goals: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [session] = await db
        .insert(LinkedInProfileSessions)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          currentHeadline: input.currentHeadline,
          currentAbout: input.currentAbout,
          currentTitle: input.currentTitle,
          industry: input.industry,
          location: input.location,
          goals: input.goals,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { session },
      };
    },
  }),

  updateProfileSession: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        currentHeadline: z.string().optional(),
        currentAbout: z.string().optional(),
        currentTitle: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        goals: z.string().optional(),
      })
      .refine(
        (input) =>
          input.currentHeadline !== undefined ||
          input.currentAbout !== undefined ||
          input.currentTitle !== undefined ||
          input.industry !== undefined ||
          input.location !== undefined ||
          input.goals !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.id, user.id);

      const [session] = await db
        .update(LinkedInProfileSessions)
        .set({
          ...(input.currentHeadline !== undefined
            ? { currentHeadline: input.currentHeadline }
            : {}),
          ...(input.currentAbout !== undefined ? { currentAbout: input.currentAbout } : {}),
          ...(input.currentTitle !== undefined ? { currentTitle: input.currentTitle } : {}),
          ...(input.industry !== undefined ? { industry: input.industry } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.goals !== undefined ? { goals: input.goals } : {}),
          updatedAt: new Date(),
        })
        .where(eq(LinkedInProfileSessions.id, input.id))
        .returning();

      return {
        success: true,
        data: { session },
      };
    },
  }),

  listProfileSessions: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const sessions = await db
        .select()
        .from(LinkedInProfileSessions)
        .where(eq(LinkedInProfileSessions.userId, user.id));

      return {
        success: true,
        data: { items: sessions, total: sessions.length },
      };
    },
  }),

  addBioVariant: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
      variantLabel: z.string().optional(),
      headline: z.string().optional(),
      aboutText: z.string().min(1),
      tone: z.string().optional(),
      lengthHint: z.string().optional(),
      isFavorite: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const [variant] = await db
        .insert(LinkedInBioVariants)
        .values({
          id: crypto.randomUUID(),
          sessionId: input.sessionId,
          variantLabel: input.variantLabel,
          headline: input.headline,
          aboutText: input.aboutText,
          tone: input.tone,
          lengthHint: input.lengthHint,
          isFavorite: input.isFavorite ?? false,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: { variant },
      };
    },
  }),

  updateBioVariant: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        sessionId: z.string().min(1),
        variantLabel: z.string().optional(),
        headline: z.string().optional(),
        aboutText: z.string().optional(),
        tone: z.string().optional(),
        lengthHint: z.string().optional(),
        isFavorite: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.variantLabel !== undefined ||
          input.headline !== undefined ||
          input.aboutText !== undefined ||
          input.tone !== undefined ||
          input.lengthHint !== undefined ||
          input.isFavorite !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedVariant(input.id, input.sessionId, user.id);

      const [variant] = await db
        .update(LinkedInBioVariants)
        .set({
          ...(input.variantLabel !== undefined ? { variantLabel: input.variantLabel } : {}),
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
          ...(input.aboutText !== undefined ? { aboutText: input.aboutText } : {}),
          ...(input.tone !== undefined ? { tone: input.tone } : {}),
          ...(input.lengthHint !== undefined ? { lengthHint: input.lengthHint } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
        })
        .where(eq(LinkedInBioVariants.id, input.id))
        .returning();

      return {
        success: true,
        data: { variant },
      };
    },
  }),

  listBioVariants: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
      favoritesOnly: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const variants = await db
        .select()
        .from(LinkedInBioVariants)
        .where(
          input.favoritesOnly
            ? and(
                eq(LinkedInBioVariants.sessionId, input.sessionId),
                eq(LinkedInBioVariants.isFavorite, true)
              )
            : eq(LinkedInBioVariants.sessionId, input.sessionId)
        );

      return {
        success: true,
        data: { items: variants, total: variants.length },
      };
    },
  }),
};
