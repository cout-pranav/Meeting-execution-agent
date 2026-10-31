import { Octokit } from "@octokit/rest";

type ActionItem = { text: string; owner: string | null; deadline: string | null; quote: string; meeting_title: string };

export function githubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO?.includes("/"));
}

/** Creates an issue for an approved action item. Returns the issue URL, or null when GitHub isn't configured. */
export async function createIssue(item: ActionItem): Promise<string | null> {
  if (!githubConfigured()) return null;
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  const body = [
    `**Owner:** ${item.owner ?? "_unassigned_"}`,
    `**Deadline:** ${item.deadline ?? "_none stated_"}`,
    `**Meeting:** ${item.meeting_title}`,
    "",
    `> ${item.quote.replace(/\n/g, "\n> ")}`,
    "",
    "_Created by Meeting Execution Agent after approval in the dashboard._",
  ].join("\n");

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const { data } = await octokit.rest.issues.create({ owner, repo, title: item.text.slice(0, 250), body });
  return data.html_url;
}
