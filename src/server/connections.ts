/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import db from './db';
import * as fileUtils from './files';

export interface Connection {
  id: string;
  session_id: string;
  from_card_id: string;
  to_card_id: string;
  created_at: string;
}

export function createConnection(
  sessionId: string,
  fromCardId: string,
  toCardId: string
): Connection {
  const id = `${fromCardId}-${toCardId}`;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO connections (id, session_id, from_card_id, to_card_id)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(id, sessionId, fromCardId, toCardId);
  
  // Update connections.json file
  updateConnectionsFile(sessionId);
  
  return {
    id,
    session_id: sessionId,
    from_card_id: fromCardId,
    to_card_id: toCardId,
    created_at: new Date().toISOString()
  };
}

export function getConnectionsBySession(sessionId: string): Connection[] {
  const stmt = db.prepare(`
    SELECT * FROM connections 
    WHERE session_id = ? 
    ORDER BY created_at
  `);
  
  return stmt.all(sessionId) as Connection[];
}

export function deleteConnection(id: string): boolean {
  const connection = getConnection(id);
  if (!connection) return false;
  
  const stmt = db.prepare('DELETE FROM connections WHERE id = ?');
  const result = stmt.run(id);
  
  if (result.changes > 0) {
    // Update connections.json file
    updateConnectionsFile(connection.session_id);
    return true;
  }
  
  return false;
}

export function deleteConnectionByCards(fromCardId: string, toCardId: string): boolean {
  const id = `${fromCardId}-${toCardId}`;
  return deleteConnection(id);
}

export function getConnection(id: string): Connection | null {
  const stmt = db.prepare('SELECT * FROM connections WHERE id = ?');
  return stmt.get(id) as Connection | null;
}

export function deleteConnectionsForCard(cardId: string): boolean {
  const stmt = db.prepare(`
    DELETE FROM connections 
    WHERE from_card_id = ? OR to_card_id = ?
  `);
  
  const result = stmt.run(cardId, cardId);
  return result.changes > 0;
}

function updateConnectionsFile(sessionId: string): void {
  const connections = getConnectionsBySession(sessionId);
  const simplifiedConnections = connections.map(c => ({
    id: c.id,
    from: c.from_card_id,
    to: c.to_card_id
  }));
  
  fileUtils.writeConnections(sessionId, simplifiedConnections);
}

export function saveAllConnections(
  sessionId: string,
  connections: Array<{ id: string; from: string; to: string }>
): void {
  // Clear existing connections
  const clearStmt = db.prepare('DELETE FROM connections WHERE session_id = ?');
  clearStmt.run(sessionId);
  
  // Insert new connections
  const insertStmt = db.prepare(`
    INSERT INTO connections (id, session_id, from_card_id, to_card_id)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertAll = db.transaction((items: Array<{ id: string; from: string; to: string }>) => {
    for (const item of items) {
      insertStmt.run(item.id, sessionId, item.from, item.to);
    }
  });
  
  insertAll(connections);
  
  // Update file
  fileUtils.writeConnections(sessionId, connections);
}
