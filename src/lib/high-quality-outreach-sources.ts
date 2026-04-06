import library from "./high-quality-outreach-sources.json";

export type HighQualityOutreachSource = {
  source_id: string;
  root_domain: string;
  article_url: string;
  article_title: string;
  source_type: string;
  language: string;
  fit_score: number;
  contact_method: string;
  primary_contact: string;
  known_recipients: string[];
  outreach_status: string;
  first_sent_at: string;
  last_sent_at: string;
  reuse_segment: string;
  reuse_notes: string;
  draft_path: string;
};

export const HIGH_QUALITY_OUTREACH_LIBRARY = library as {
  generated_at: string;
  library_version: string;
  source_count: number;
  root_domain_count: number;
  segments: Record<string, number>;
  sources: HighQualityOutreachSource[];
};
