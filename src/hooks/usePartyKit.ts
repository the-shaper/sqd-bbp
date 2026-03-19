import { useEffect, useRef, useState, useCallback } from 'react';
import PartySocket from 'partysocket';
import type { Message, UserPresence } from '../../party/index';
import type { CardData } from '../types';

const PARTY_KIT_HOST = process.env.PARTYKIT_HOST || 'localhost:1999';
const PARTY_KIT_PROTOCOL = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';

interface UsePartyKitOptions {
  sessionId: string | null;
  userId: string;
  userName: string;
  userColor: string;
  onCardCreate?: (card: CardData) => void;
  onCardUpdate?: (cardId: string, updates: Partial<CardData>) => void;
  onCardDelete?: (cardId: string) => void;
  onCardReorder?: (section: string, cardIds: string[]) => void;
  onConnectionCreate?: (connection: { id: string; from: string; to: string }) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onPresenceUpdate?: (users: UserPresence[]) => void;
  onCursorMove?: (userId: string, x: number, y: number) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: string) => void;
}

interface UsePartyKitReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  users: UserPresence[];
  sendCardCreate: (card: CardData) => void;
  sendCardUpdate: (cardId: string, updates: Partial<CardData>) => void;
  sendCardDelete: (cardId: string) => void;
  sendCardReorder: (section: string, cardIds: string[]) => void;
  sendConnectionCreate: (connection: { id: string; from: string; to: string }) => void;
  sendConnectionDelete: (connectionId: string) => void;
  sendPresenceUpdate: (updates: Partial<UserPresence>) => void;
  sendCursorMove: (x: number, y: number) => void;
  reconnect: () => void;
}

export function usePartyKit({
  sessionId,
  userId,
  userName,
  userColor,
  onCardCreate,
  onCardUpdate,
  onCardDelete,
  onCardReorder,
  onConnectionCreate,
  onConnectionDelete,
  onPresenceUpdate,
  onCursorMove,
  onUserJoin,
  onUserLeave,
}: UsePartyKitOptions): UsePartyKitReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [users, setUsers] = useState<UserPresence[]>([]);
  
  const socketRef = useRef<PartySocket | null>(null);
  const userPresenceRef = useRef<UserPresence>({
    id: userId,
    name: userName,
    color: userColor,
    lastActive: Date.now(),
  });

  // Connect to PartyKit when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setIsConnected(false);
      setUsers([]);
      return;
    }

    setIsConnecting(true);
    setError(null);

    const room = `session-${sessionId}`;
    const wsUrl = `${PARTY_KIT_PROTOCOL}://${PARTY_KIT_HOST}/party/${room}`;

    console.log(`[PartyKit] Connecting to ${wsUrl}`);

    const socket = new PartySocket({
      host: `${PARTY_KIT_PROTOCOL}://${PARTY_KIT_HOST}`,
      room,
    });

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[PartyKit] Connected with userId:', userId);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);

      // Send user join message
      const joinMessage: Message = {
        type: 'user:join',
        user: userPresenceRef.current,
        timestamp: Date.now(),
      };
      socket.send(JSON.stringify(joinMessage));
      console.log('[PartyKit] Sent user:join', userPresenceRef.current);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Message;
        
        switch (data.type) {
          case 'card:create':
            console.log('[PartyKit] Received card:create', data.card.id, 'from', data.userId, 'my userId:', userId);
            if (data.userId !== userId && onCardCreate) {
              console.log('[PartyKit] Processing card:create from other user');
              onCardCreate(data.card);
            } else {
              console.log('[PartyKit] Ignoring card:create (own card or no handler)');
            }
            break;

          case 'card:update':
            if (data.userId !== userId && onCardUpdate) {
              onCardUpdate(data.cardId, data.updates);
            }
            break;

          case 'card:delete':
            if (data.userId !== userId && onCardDelete) {
              onCardDelete(data.cardId);
            }
            break;

          case 'card:reorder':
            if (data.userId !== userId && onCardReorder) {
              onCardReorder(data.section, data.cardIds);
            }
            break;

          case 'connection:create':
            if (data.userId !== userId && onConnectionCreate) {
              onConnectionCreate(data.connection);
            }
            break;

          case 'connection:delete':
            if (data.userId !== userId && onConnectionDelete) {
              onConnectionDelete(data.connectionId);
            }
            break;

          case 'presence:init': {
            const initData = data as { type: 'presence:init'; users: UserPresence[]; timestamp: number };
            if (initData.users && Array.isArray(initData.users)) {
              setUsers(initData.users.filter(u => u.id !== userId));
              if (onPresenceUpdate) {
                onPresenceUpdate(initData.users);
              }
            }
            break;
          }

          case 'presence:update':
            if ('user' in data && data.user) {
              setUsers(prev => {
                const filtered = prev.filter(u => u.id !== data.user!.id);
                if (data.user!.id !== userId) {
                  return [...filtered, data.user!];
                }
                return filtered;
              });
              if (onPresenceUpdate) {
                onPresenceUpdate([...users, data.user]);
              }
            }
            break;

          case 'cursor:move':
            if (data.userId !== userId && onCursorMove) {
              onCursorMove(data.userId, data.x, data.y);
            }
            // Update user cursor in local state
            setUsers(prev => prev.map(u => 
              u.id === data.userId ? { ...u, cursor: { x: data.x, y: data.y } } : u
            ));
            break;

          case 'user:join':
            if ('user' in data && data.user && data.user.id !== userId) {
              setUsers(prev => [...prev.filter(u => u.id !== data.user!.id), data.user!]);
              if (onUserJoin) {
                onUserJoin(data.user);
              }
            }
            break;

          case 'user:leave':
            if ('userId' in data) {
              setUsers(prev => prev.filter(u => u.id !== data.userId));
              if (onUserLeave) {
                onUserLeave(data.userId);
              }
            }
            break;

          default:
            console.log('[PartyKit] Unknown message type:', (data as any).type);
        }
      } catch (err) {
        console.error('[PartyKit] Error parsing message:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('[PartyKit] WebSocket error:', err);
      setError(new Error('WebSocket connection error'));
      setIsConnected(false);
      setIsConnecting(false);
    };

    socket.onclose = () => {
      console.log('[PartyKit] Disconnected');
      setIsConnected(false);
      setIsConnecting(false);
    };

    // Send leave message before page refresh/close
    const handleBeforeUnload = () => {
      if (socket.readyState === WebSocket.OPEN) {
        const leaveMessage: Message = {
          type: 'user:leave',
          userId,
          timestamp: Date.now(),
        };
        // Use sendBeacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify(leaveMessage)], { type: 'application/json' });
        navigator.sendBeacon(`${PARTY_KIT_PROTOCOL}://${PARTY_KIT_HOST}/party/${room}`, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Send leave message before closing (for component unmount)
      if (socket.readyState === WebSocket.OPEN) {
        const leaveMessage: Message = {
          type: 'user:leave',
          userId,
          timestamp: Date.now(),
        };
        socket.send(JSON.stringify(leaveMessage));
      }
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId, userId]);

  // Send card create
  const sendCardCreate = useCallback((card: CardData) => {
    console.log('[PartyKit] Attempting to send card:create', card.id, 'Socket state:', socketRef.current?.readyState);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'card:create',
        card,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
      console.log('[PartyKit] Sent card:create', card.id);
    } else {
      console.warn('[PartyKit] Socket not open, cannot send card:create. State:', socketRef.current?.readyState);
    }
  }, [userId]);

  // Send card update
  const sendCardUpdate = useCallback((cardId: string, updates: Partial<CardData>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'card:update',
        cardId,
        updates,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Send card delete
  const sendCardDelete = useCallback((cardId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'card:delete',
        cardId,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Send card reorder
  const sendCardReorder = useCallback((section: string, cardIds: string[]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'card:reorder',
        section,
        cardIds,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Send connection create
  const sendConnectionCreate = useCallback((connection: { id: string; from: string; to: string }) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'connection:create',
        connection,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Send connection delete
  const sendConnectionDelete = useCallback((connectionId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'connection:delete',
        connectionId,
        timestamp: Date.now(),
        userId,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Send presence update
  const sendPresenceUpdate = useCallback((updates: Partial<UserPresence>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      userPresenceRef.current = { ...userPresenceRef.current, ...updates };
      const message: Message = {
        type: 'presence:update',
        user: userPresenceRef.current,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Send cursor move (throttled)
  const sendCursorMove = useCallback((x: number, y: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: Message = {
        type: 'cursor:move',
        userId,
        x,
        y,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [userId]);

  // Reconnect - PartySocket handles reconnection automatically
  // This is just for manual reconnection if needed
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.reconnect();
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    users,
    sendCardCreate,
    sendCardUpdate,
    sendCardDelete,
    sendCardReorder,
    sendConnectionCreate,
    sendConnectionDelete,
    sendPresenceUpdate,
    sendCursorMove,
    reconnect,
  };
}
