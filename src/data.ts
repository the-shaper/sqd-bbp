import { CardData } from './types';

export const COLUMNS = [
  { id: 'place', title: 'Your Place', color: 'bg-[#e8f5e9]' },
  { id: 'role', title: 'Your Role', color: 'bg-[#ffebee]' },
  { id: 'challenge', title: 'Your Challenge', color: 'bg-[#e3f2fd]' },
  { id: 'point_a', title: 'Point A', color: 'bg-[#f3e5f5]' },
  { id: 'point_b', title: 'Point B', color: 'bg-[#e0f7fa]' },
  { id: 'change', title: 'Change', color: 'bg-white border-2 border-gray-800' },
  { id: 'story', title: 'Story', color: 'bg-[#fff9c4]' },
];

export const INITIAL_CARDS: CardData[] = [
  { id: 'c1', section: 'place', content: "They're at the start of their new venture", starred: false },
  { id: 'c2', section: 'place', content: "You are at a crossroads in their business", starred: true },
  { id: 'c3', section: 'place', content: "They are about to expand", starred: false },
  
  { id: 'c4', section: 'role', content: "To create cheaper energy sources for everyone", starred: false },
  { id: 'c5', section: 'role', content: "To Build Sustainable Communities", starred: false },
  { id: 'c6', section: 'role', content: "To enable your people with access to a clean grid", starred: true },
  
  { id: 'c7', section: 'challenge', content: "To streamline the supply chain and get parts on time", starred: true },
  { id: 'c8', section: 'challenge', content: "To earn the trust of their community", starred: false },
  
  { id: 'c9', section: 'point_a', content: "Where you are at right now", starred: false },
  { id: 'c10', section: 'point_b', content: "Where you need to be", starred: false },
  
  { id: 'c11', section: 'change', content: "The transformation that needs to happen to get from A to B", starred: false },
];
