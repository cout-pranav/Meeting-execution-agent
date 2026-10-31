export type Conflict = {
  id: number;
  item_id: number;
  explanation: string;
  prior_id: number;
  prior_text: string;
  prior_quote: string;
  prior_owner: string | null;
  prior_meeting: string;
  prior_created_at: string;
};

export type Item = {
  id: number;
  meeting_title: string;
  type: "decision" | "action";
  text: string;
  owner: string | null;
  deadline: string | null;
  quote: string;
  status: "pending" | "approved";
  issue_url: string | null;
  created_at: string;
  conflicts: Conflict[];
};

export type Health = { status: string; db: boolean; gemini: boolean; github: string | null };

export type ItemAction = "approve" | "reject";
export type OnAct = (id: number, action: ItemAction) => void;
