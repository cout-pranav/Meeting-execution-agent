import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const ExtractedItem = z.object({
  type: z.enum(["decision", "action"]),
  text: z.string().describe("One clear sentence stating the decision or the task"),
  owner: z.string().nullable().describe("Speaker name responsible, exactly as labeled in the transcript; null if nobody was named"),
  deadline: z.string().nullable().describe("YYYY-MM-DD, relative dates resolved against the meeting date; null if none was stated"),
  quote: z.string().describe("Verbatim line(s) from the transcript that support this item"),
});
export type ExtractedItem = z.infer<typeof ExtractedItem>;

export type PriorDecision = { id: number; text: string; meeting_title: string; created_at: Date };
export type FoundConflict = { newIndex: number; priorId: number; explanation: string };

function model() {
  const id = process.env.GEMINI_MODEL;
  if (!id) throw new Error("GEMINI_MODEL is not set");
  return google(id);
}

export async function extractItems(transcript: string, meetingDate: string): Promise<ExtractedItem[]> {
  const { output } = await generateText({
    model: model(),
    output: Output.object({ schema: z.object({ items: z.array(ExtractedItem) }) }),
    system:
      "You extract decisions and action items from meeting transcripts in `Speaker: text` format. " +
      "A decision is something the group agreed on. An action item is a task someone will do. " +
      "Only extract what is actually said: never invent items, owners or deadlines. " +
      "Every item must include a verbatim supporting quote from the transcript.",
    prompt: `Meeting date: ${meetingDate}\n\nTranscript:\n${transcript}`,
  });
  return output.items.filter((i) => i.text.trim() && i.quote.trim());
}

export async function findConflicts(newDecisions: string[], prior: PriorDecision[]): Promise<FoundConflict[]> {
  if (newDecisions.length === 0 || prior.length === 0) return [];

  const { output } = await generateText({
    model: model(),
    output: Output.object({
      schema: z.object({
        conflicts: z.array(
          z.object({
            newIndex: z.number().int().describe("Index N of the new decision"),
            priorId: z.number().int().describe("ID of the earlier decision it conflicts with"),
            explanation: z.string().describe("One or two sentences on how they contradict"),
          }),
        ),
      }),
    }),
    system:
      "You compare new meeting decisions against earlier approved decisions. " +
      "Report a conflict only for a direct reversal, a changed parameter (date, budget, owner, scope), " +
      "or a scope contradiction. Decisions that are merely related or consistent are not conflicts.",
    prompt:
      "Earlier approved decisions:\n" +
      prior.map((p) => `#${p.id} (${p.meeting_title}): ${p.text}`).join("\n") +
      "\n\nNew decisions:\n" +
      newDecisions.map((text, i) => `N${i}: ${text}`).join("\n"),
  });

  const priorIds = new Set(prior.map((p) => p.id));
  return output.conflicts.filter(
    (c) => c.newIndex >= 0 && c.newIndex < newDecisions.length && priorIds.has(c.priorId),
  );
}
