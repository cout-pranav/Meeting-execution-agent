# Project Scope — Meeting Execution Agent

## 1. Problem Statement

Decisions made in meetings get lost.

- **Nothing is captured.** Decisions and commitments are spoken aloud but rarely written down in a structured way.
- **Nobody owns it.** Action items leave the meeting without a clear owner or deadline, so nobody follows up.
- **Decisions contradict each other silently.** A decision made today can reverse or conflict with one made weeks ago, and nobody notices until the work collides.
- **Summarizers aren't enough.** Existing transcript summarizers produce a one-off summary. They have no memory across meetings and they don't act on anything.

**Who is affected:** team leads and project managers who run recurring meetings, and the individual contributors who are assigned action items.

## 2. Solution

A **Meeting Execution Agent**. It turns speaker-labeled meeting transcripts into tracked, owned and reminded work, and it remembers every decision across meetings so it can flag contradictions.

### End-to-end flow

```
Transcript upload (VTT / SRT / TXT, speaker-labeled)
        │
        ▼
1. Ingest & normalize speakers  →  participant identities
        │
        ▼
2. Extract decisions, action items, owners, deadlines
        │
        ▼
3. Memory lookup + conflict check against past decisions
        │
        ▼
4. Dashboard confirmation  (approve / edit / reject each item & conflict)
        │  only approved items continue
        ▼
5. Create GitHub Issues  +  store decisions in memory
        │
        ▼
6. Scheduler  →  deadline reminders (Slack DM) + weekly per-person digest (Slack DM)
```

### Differentiators

- **Cross-meeting memory:** a persistent, searchable store of every decision, with its source meeting, date and participants.
- **Conflict detection:** new decisions are checked against that memory, and a conflict is flagged with a citation to the earlier decision.

These two features are what make this a real system rather than a transcript summarizer.

### Guiding principle

**Human in the loop.** The agent never posts, creates or sends anything until a human approves it in the web dashboard.

### Confirmed decisions

| Area | Choice |
|---|---|
| Transcript input | Text transcripts that already have speaker labels (Zoom / Teams / Otter exports: VTT, SRT, TXT) |
| Task tracker | GitHub Issues |
| Confirmation (approve / edit / reject) | React web dashboard |
| Reminders & weekly digest | Slack DMs |
| Tech stack | See [techstack.md](techstack.md) |

## 3. Features

### MVP

| # | Feature | Description | Acceptance criteria |
|---|---|---|---|
| F1 | **Transcript ingestion with speaker attribution** | Parse VTT, SRT and plain-text transcripts that have speaker labels. Normalize speaker names to known participants. | Every utterance has a speaker and a timestamp (if present). An unknown speaker is flagged, not dropped. |
| F2 | **Extraction** | Pull out decisions, action items, owners and deadlines. Resolve relative dates ("by Friday") against the meeting date. | Every item includes the transcript quote it came from. Owner and deadline are filled in when stated and left blank (and flagged) when not. |
| F3 | **Cross-meeting decision memory** | Store each approved decision with its meeting, date, participants and topic. | Decisions persist across sessions. They can be retrieved by topic or keyword. |
| F4 | **Conflict detection** | Compare each new decision against related past decisions and flag contradictions or changed parameters (dates, budgets, scope). | Each conflict shows the new decision, the earlier decision, the earlier meeting and date, and a short explanation. |
| F5 | **Web confirmation step** | Show the extracted items and conflicts in a review queue in the dashboard, with approve / edit / reject actions on each. | Nothing reaches GitHub or memory without approval. Edits are kept. Rejected items are discarded. |
| F6 | **GitHub Issue creation** | Create one issue per approved action item. | Each issue has a title, a body with context and a link back to the meeting, an assignee, and the deadline. |
| F7 | **Deadline reminders** | Send a Slack DM to the owner ahead of each deadline. | The reminder goes out at the configured lead time and links to the GitHub Issue. No reminder is sent for closed issues. |
| F8 | **Weekly digest per person** | Send each participant a weekly Slack DM. | The digest lists the person's open action items, upcoming deadlines, and decisions made that week in meetings they attended. |

### Stretch

- Sync issue status (open/closed) back from GitHub, so reminders and digests stay accurate.
- Ask about decision history in Slack: *"What did we decide about X?"*
- Support more trackers (Jira, Linear, Asana).
- A conflict-resolution workflow: mark an earlier decision as *superseded*.

### Out of scope (for now)

- Audio transcription and speaker diarization
- Live meeting bots (Zoom / Meet / Teams)
- Trackers other than GitHub Issues

## 4. Gaps & Open Questions

The README doesn't answer these. Each needs a decision before or during the build.

| # | Gap | Why it matters | Options / suggested default |
|---|---|---|---|
| G1 | **Identity mapping** | Speaker names in a transcript ("Priya", "P. Shah") have to map to Slack users and GitHub usernames before items can be assigned or DMed. | A roster/config file mapping name → Slack ID → GitHub username. Unmatched speakers are flagged at confirmation. |
| G2 | **What counts as a conflict** | Without a definition, conflict detection is either too noisy or misses things. | Define the types: direct reversal, a changed parameter (date, budget, owner), and scope contradiction. |
| G3 | **How conflicts are resolved** | After a conflict is flagged, someone has to decide what happens to the old decision. | The confirmer chooses: *supersede old*, *keep both*, or *escalate*. |
| G4 | **Memory scope & retention** | Comparing against every past decision in the org is noisy and has privacy implications. | Scope memory per team or project. Decide how long decisions are kept and whether they can be marked superseded. |
| G5 | **Missing owner or deadline** | Many action items are stated vaguely ("someone should look into this"). | Require them at confirmation, assign to the meeting organizer, or create the issue unassigned. |
| G6 | **Who confirms** | The meeting organizer may not be the right person to approve every item. | Confirmation happens in the dashboard, so this is tied to dashboard auth: who can log in and approve? The organizer approves everything, or each owner approves their own items. Also decide what happens to items that stay pending. |
| G7 | **Target GitHub repo** | Action items from one meeting may belong to different repos. | One default repo per team, optionally with topic → repo mapping. |
| G8 | **Deadlines in GitHub** | GitHub Issues has no native due-date field. | A milestone, a `due:YYYY-MM-DD` label, a due-date field in a GitHub Projects (v2) board, or the deadline in the issue body. |
| G9 | **Reminder & digest timing** | Defaults and timezones affect whether reminders are useful. | Reminder lead time (e.g. 24h before), digest day and time (e.g. Monday 9am), and a timezone per user. |
| G10 | **Extraction quality** | LLM extraction can invent items, miss them, or duplicate items already tracked from earlier meetings. | Require a supporting quote for every item, show a confidence score, and check for duplicates against open issues. |
| G11 | **Privacy & security** | Transcripts may contain sensitive information. | Decide where transcripts and memory are stored, who can read them, and how the Slack and GitHub tokens are stored. |
| G12 | **Success criteria & demo** | The hackathon needs a demo that clearly shows the differentiators. | A set of 3–4 sample transcripts from a recurring meeting, with a planted conflict between meetings. |
| G13 | ~~**Tech stack**~~ | **Resolved.** | See [techstack.md](techstack.md). The timeline is still open. |
