/**
 * LinkedIn Bio Optimizer - improve your LinkedIn summary & headline.
 *
 * Design goals:
 * - Sessions focused on one user's profile at a time.
 * - Store original data + multiple improved/variant bios and headlines.
 * - Useful for later A/B testing or quick reuse.
 */

import { defineTable, column, NOW } from "astro:db";

export const LinkedInProfileSessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    currentHeadline: column.text({ optional: true }),
    currentAbout: column.text({ optional: true }),      // existing "About" section
    currentTitle: column.text({ optional: true }),      // current role
    industry: column.text({ optional: true }),
    location: column.text({ optional: true }),
    goals: column.text({ optional: true }),             // e.g. "job search", "personal branding"
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const LinkedInBioVariants = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text({
      references: () => LinkedInProfileSessions.columns.id,
    }),
    variantLabel: column.text({ optional: true }),      // "Professional", "Storytelling", "Short"
    headline: column.text({ optional: true }),
    aboutText: column.text(),                           // improved/rewritten "About"
    tone: column.text({ optional: true }),              // "formal", "friendly", "thought-leader"
    lengthHint: column.text({ optional: true }),        // "short", "medium", "long"
    isFavorite: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  LinkedInProfileSessions,
  LinkedInBioVariants,
} as const;
