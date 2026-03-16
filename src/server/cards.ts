/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import db from './db';
import * as fileUtils from './files';

export interface Card {
  id: string;
  session_id: string;
  section: string;
  file_path: string;
  order_index: number;
  starred: boolean;
  created_at: string;
  updated_at: string;
  content?: string;
}

export function createCard(
  sessionId: string,
  cardId: string,
  section: string,
  content: string,
  order: number = 0,
  starred: boolean = false
): Card {
  // Write to file first
  const filePath = fileUtils.writeCardFile(
    sessionId,
    cardId,
    section,
    content,
    order,
    starred
  );
  
  // Then index in database
  const stmt = db.prepare(`
    INSERT INTO cards (id, session_id, section, file_path, order_index, starred)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(cardId, sessionId, section, filePath, order, starred ? 1 : 0);
  
  return {
    id: cardId,
    session_id: sessionId,
    section,
    file_path: filePath,
    order_index: order,
    starred,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function getCard(id: string): Card | null {
  const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
  const card = stmt.get(id) as Card | null;
  
  if (card) {
    // Load content from file
    const cardFile = fileUtils.readCardFile(card.file_path);
    if (cardFile) {
      card.content = cardFile.content;
    }
  }
  
  return card;
}

export function getCardsBySession(sessionId: string): Card[] {
  const stmt = db.prepare(`
    SELECT * FROM cards 
    WHERE session_id = ? 
    ORDER BY section, order_index
  `);
  
  const cards = stmt.all(sessionId) as Card[];
  
  // Load content for each card
  for (const card of cards) {
    const cardFile = fileUtils.readCardFile(card.file_path);
    if (cardFile) {
      card.content = cardFile.content;
    }
  }
  
  return cards;
}

export function updateCard(
  cardId: string,
  updates: Partial<Pick<Card, 'section' | 'order_index' | 'starred'>>,
  newContent?: string
): boolean {
  const card = getCard(cardId);
  if (!card) return false;
  
  // Update file first
  const fileUpdates: Partial<fileUtils.CardFrontmatter> = {};
  if (updates.section !== undefined) fileUpdates.section = updates.section;
  if (updates.order_index !== undefined) fileUpdates.order = updates.order_index;
  if (updates.starred !== undefined) fileUpdates.starred = updates.starred;
  
  const fileUpdated = fileUtils.updateCardFile(card.file_path, fileUpdates, newContent);
  if (!fileUpdated) return false;
  
  // Update database index
  const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
  
  if (fields.length > 0) {
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      if (field === 'starred') {
        return updates[field] ? 1 : 0;
      }
      return updates[field as keyof typeof updates];
    });
    
    const stmt = db.prepare(`
      UPDATE cards 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(...values, cardId);
  }
  
  return true;
}

export function deleteCard(cardId: string): boolean {
  const card = getCard(cardId);
  if (!card) return false;
  
  // Delete file first
  fileUtils.deleteCardFile(card.file_path);
  
  // Delete from database
  const stmt = db.prepare('DELETE FROM cards WHERE id = ?');
  const result = stmt.run(cardId);
  
  return result.changes > 0;
}

export function reorderCards(sessionId: string, section: string, cardIds: string[]): boolean {
  const stmt = db.prepare(`
    UPDATE cards 
    SET order_index = ?
    WHERE id = ? AND session_id = ?
  `);
  
  const updateFile = db.transaction((ids: string[]) => {
    for (let i = 0; i < ids.length; i++) {
      stmt.run(i, ids[i], sessionId);
      
      // Also update the file
      const card = getCard(ids[i]);
      if (card) {
        fileUtils.updateCardFile(card.file_path, { order: i });
      }
    }
  });
  
  try {
    updateFile(cardIds);
    return true;
  } catch (error) {
    console.error('Error reordering cards:', error);
    return false;
  }
}

export function getNextOrderIndex(sessionId: string, section: string): number {
  const stmt = db.prepare(`
    SELECT MAX(order_index) as max_order 
    FROM cards 
    WHERE session_id = ? AND section = ?
  `);
  
  const result = stmt.get(sessionId, section) as { max_order: number | null };
  return (result.max_order ?? -1) + 1;
}
