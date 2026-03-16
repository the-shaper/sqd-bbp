export type Section = 'place' | 'role' | 'challenge' | 'point_a' | 'point_b' | 'change' | 'story';

export interface CardData {
  id: string;
  section: Section;
  content: string;
  starred: boolean;
  notes?: string;
  order?: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  brief: string;
  notes: string;
}
