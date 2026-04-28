export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  embedUrl?: string;
  duration?: string;
}

// Provider-agnostic tutorial metadata. A future video adapter can populate
// embedUrl/url from Mux, YouTube, self-hosted files, or another provider.
export const TUTORIALS: TutorialItem[] = [
  {
    id: 'intro',
    title: 'Introduction to Beyond Bullet Points',
    description: 'Learn the core storytelling framework and how to use the canvas.',
    duration: '3 min',
  },
  {
    id: 'facilitator',
    title: 'Facilitator Guide',
    description: 'How to create sessions, onboard projects, and manage collaborators.',
    duration: '5 min',
  },
  {
    id: 'ai',
    title: 'Using AI Assistance',
    description: 'Tips for generating ideas and refining cards with AI.',
    duration: '4 min',
  },
];
