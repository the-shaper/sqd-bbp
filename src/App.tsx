/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import NewProject from './components/NewProject';
import Canvas from './components/Canvas';
import LoginPage from './components/LoginPage';
import PasswordModal from './components/PasswordModal';
import SessionPasswordWall from './components/SessionPasswordWall';
import { UserProfilePrompt, UserProfile } from './components/UserProfilePrompt';
import { ActiveUsers, ConnectionStatus } from './components/UserPresence';
import { usePartyKit } from './hooks/usePartyKit';
import type { LiveConnection } from '../party/index';
import { CardData } from './types';
import { INITIAL_CARDS } from './data';
import { generateCards, ModelType } from './services/ai';

// Session types
interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  project_client?: string;
  project_background?: string;
  project_notes?: string;
  onboarding_completed: boolean;
  has_password: boolean;
}

// Main App Component with Router
export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

// Routes Component
function AppRoutes() {
  // Admin authentication state - start null, verify before trusting
  const [adminSessionId, setAdminSessionId] = useState<string | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Verify admin session on every mount - security: don't trust localStorage alone
  useEffect(() => {
    const verifyAdminSession = async () => {
      const storedSessionId = localStorage.getItem('adminSessionId');
      
      if (storedSessionId) {
        try {
          console.log('[Auth] Verifying admin session...');
          const response = await fetch('/api/admin/check', {
            headers: { 'x-admin-session': storedSessionId }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated) {
              console.log('[Auth] Admin session verified');
              setAdminSessionId(storedSessionId);
              setIsAdminVerified(true);
            } else {
              console.log('[Auth] Admin session invalid - clearing');
              localStorage.removeItem('adminSessionId');
              setAdminSessionId(null);
              setIsAdminVerified(false);
            }
          } else {
            console.log('[Auth] Admin check failed - clearing session');
            localStorage.removeItem('adminSessionId');
            setAdminSessionId(null);
            setIsAdminVerified(false);
          }
        } catch (error) {
          console.error('[Auth] Error verifying admin session:', error);
          localStorage.removeItem('adminSessionId');
          setAdminSessionId(null);
          setIsAdminVerified(false);
        }
      } else {
        console.log('[Auth] No stored admin session');
        setIsAdminVerified(false);
      }
      
      setIsCheckingAuth(false);
    };
    
    verifyAdminSession();
  }, []);

  const handleLogin = (sessionId: string) => {
    setAdminSessionId(sessionId);
    setIsAdminVerified(true);
  };

  const handleLogout = async () => {
    if (adminSessionId) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: adminSessionId })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('adminSessionId');
    setAdminSessionId(null);
    setIsAdminVerified(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login route */}
      <Route 
        path="/login" 
        element={
          adminSessionId ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        } 
      />
      
      {/* Admin dashboard */}
      <Route 
        path="/" 
        element={
          isAdminVerified ? (
            <Dashboard 
              adminSessionId={adminSessionId!} 
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Session view (public - accessible to anyone with URL) */}
      <Route 
        path="/:sessionId" 
        element={
          <SessionView 
            isAdmin={isAdminVerified}
            adminSessionId={adminSessionId}
          />
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Admin Dashboard Component
interface DashboardProps {
  adminSessionId: string;
  onLogout: () => void;
}

function Dashboard({ adminSessionId, onLogout }: DashboardProps) {
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newSessionInfo, setNewSessionInfo] = useState<{id: string, name: string, password: string | null} | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [sessionPasswords, setSessionPasswords] = useState<Record<string, string>>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem('sessionPasswords');
    return stored ? JSON.parse(stored) : {};
  });

  // Save passwords to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sessionPasswords', JSON.stringify(sessionPasswords));
  }, [sessionPasswords]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Load all sessions
  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions', {
        headers: { 'x-admin-session': adminSessionId }
      });
      if (response.ok) {
        const data = await response.json();
        setAllSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, [adminSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = async (name: string, requirePassword: boolean) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-session': adminSessionId 
        },
        body: JSON.stringify({
          name,
          require_password: requirePassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadSessions();
        
        // Show the session info with password (if generated)
        setNewSessionInfo({
          id: data.session.id,
          name: data.session.name,
          password: data.session.password
        });
        
        // Store password for later viewing in the list
        if (data.session.password) {
          setSessionPasswords(prev => ({
            ...prev,
            [data.session.id]: data.session.password
          }));
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      showToast('Failed to create session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'x-admin-session': adminSessionId }
      });

      if (response.ok) {
        await loadSessions();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        onViewChange={() => {}} 
        currentView="new" 
        selectedModel="minimax-m2.5" 
        onModelChange={() => {}}
        sessions={allSessions}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
        onLogout={onLogout}
        isAdmin={true}
      />
      
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar projectName="Admin Dashboard" />
        <div className="flex flex-1 overflow-hidden relative">
          <main className="flex-1 overflow-auto relative bg-gray-50/30 p-8">
            {/* Toast */}
            {toastMessage && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2">
                <span>{toastMessage}</span>
                <button onClick={() => setToastMessage(null)} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
              </div>
            )}

            {/* New Session Modal */}
            {newSessionInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                  <div className="bg-green-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white">Session Created!</h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700">Session Name</label>
                      <div className="text-lg font-semibold">{newSessionInfo.name}</div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700">Session URL</label>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1 font-mono">
                          /{newSessionInfo.id}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/${newSessionInfo.id}`);
                            showToast('URL copied to clipboard!');
                          }}
                          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {newSessionInfo.password && (
                      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <label className="text-sm font-medium text-yellow-800 block mb-1">🔒 Session Password</label>
                        <div className="flex items-center gap-2">
                          <code className="bg-white px-3 py-2 rounded text-lg font-mono font-bold text-yellow-900 flex-1">
                            {newSessionInfo.password}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(newSessionInfo.password!);
                              showToast('Password copied to clipboard!');
                            }}
                            className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          Share this password with players who need to edit the session.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setNewSessionInfo(null)}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Stay Here
                      </button>
                      <a
                        href={`/${newSessionInfo.id}`}
                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-center"
                      >
                        Open Session →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">All Sessions ({allSessions.length})</h2>
              
              {allSessions.length === 0 ? (
                <p className="text-gray-500">No sessions yet. Create one from the sidebar.</p>
              ) : (
                <div className="grid gap-4">
                  {allSessions.map(session => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{session.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{session.id}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                          {session.has_password ? (
                            <>
                              <span className="flex items-center gap-1">
                                🔒 Password protected
                                {sessionPasswords[session.id] ? (
                                  <>
                                    <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                                      {visiblePasswords[session.id] 
                                        ? sessionPasswords[session.id]
                                        : '••••••••'
                                      }
                                    </span>
                                    <button
                                      onClick={() => {
                                        setVisiblePasswords(prev => ({
                                          ...prev,
                                          [session.id]: !prev[session.id]
                                        }));
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 text-xs underline ml-1"
                                    >
                                      {visiblePasswords[session.id] ? 'Hide' : 'Show'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(sessionPasswords[session.id]);
                                        showToast('Password copied!');
                                      }}
                                      className="text-gray-500 hover:text-gray-700 text-xs ml-1"
                                      title="Copy password"
                                    >
                                      Copy
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic">(Password not stored - create a new session to see passwords)</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span>🔓 Open session</span>
                          )}
                          <span>•</span>
                          <span>{session.onboarding_completed ? '✅ Ready' : '⏳ Onboarding'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/${session.id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
              <h3 className="font-semibold text-indigo-900 mb-2">Quick Tips</h3>
              <ul className="text-sm text-indigo-800 space-y-1">
                <li>• Create sessions from the sidebar with optional passwords</li>
                <li>• Click "Open" to start the onboarding process</li>
                <li>• Share session URLs with players: website.com/bdo-xxxx</li>
                <li>• Sessions with passwords require players to enter it before viewing content</li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Session View Component (for both admin and players)
interface SessionViewProps {
  isAdmin: boolean;
  adminSessionId: string | null;
}

function SessionView({ isAdmin, adminSessionId }: SessionViewProps) {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [connections, setConnections] = useState<Array<{ id: string; from: string; to: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordWall, setShowPasswordWall] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Project data for onboarding/canvas
  const [projectData, setProjectData] = useState({ client: '', background: '', notes: '' });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>('minimax-m2.5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [adminPartyKitToken, setAdminPartyKitToken] = useState<string | null>(null);
  const [presenceDebug, setPresenceDebug] = useState<string>('Presence not loaded yet');

  // PartyKit / Multiplayer state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  // Load or create user profile on mount
  useEffect(() => {
    if (isAdmin) {
      // For admins: reuse existing profile or create one with a stable ID
      const existingProfile = localStorage.getItem('bbp_user_profile');
      let adminProfile: UserProfile;
      if (existingProfile) {
        try {
          const parsed = JSON.parse(existingProfile);
          // Reuse if it's an admin profile, otherwise create new
          if (parsed.id && parsed.id.startsWith('admin_')) {
            adminProfile = parsed;
          } else {
            adminProfile = {
              id: 'admin_' + Math.random().toString(36).substr(2, 9),
              name: 'Admin',
              color: '#EF4444',
            };
          }
        } catch {
          adminProfile = {
            id: 'admin_' + Math.random().toString(36).substr(2, 9),
            name: 'Admin',
            color: '#EF4444',
          };
        }
      } else {
        adminProfile = {
          id: 'admin_' + Math.random().toString(36).substr(2, 9),
          name: 'Admin',
          color: '#EF4444',
        };
      }
      localStorage.setItem('bbp_user_profile', JSON.stringify(adminProfile));
      localStorage.setItem('bbp_user_id', adminProfile.id);
      setUserProfile(adminProfile);
    } else {
      // For guests: don't clear, check if they exist first to avoid name re-entry on refresh
      const storedProfile = localStorage.getItem('bbp_user_profile');
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          if (parsed?.id?.startsWith('admin_')) {
            localStorage.removeItem('bbp_user_profile');
            localStorage.removeItem('bbp_user_id');
            setUserProfile(null);
            setShowProfilePrompt(true);
          } else {
            setUserProfile(parsed);
          }
        } catch (e) {
          localStorage.removeItem('bbp_user_profile');
          localStorage.removeItem('bbp_user_id');
          setUserProfile(null);
          setShowProfilePrompt(true);
        }
      } else {
        setUserProfile(null);
        setShowProfilePrompt(true);
      }
    }
  }, [isAdmin]);

  const handleExitSession = () => {
    localStorage.removeItem('bbp_user_profile');
    localStorage.removeItem('bbp_user_id');
    window.location.href = '/';
  };

  const shouldConnectPartyKit = !!sessionId && !!userProfile;
  const canConnectPartyKit = shouldConnectPartyKit && (!isAdmin || !!adminPartyKitToken);
  const partySessionId = shouldConnectPartyKit ? (sessionId || null) : null;
  const partyUserId = userProfile?.id || '';
  const partyUserName = userProfile?.name || '';
  const partyUserColor = userProfile?.color || '#3B82F6';

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  useEffect(() => {
    if (!isAdmin || !adminSessionId || !sessionId) {
      setAdminPartyKitToken(null);
      return;
    }

    const fetchAdminToken = async () => {
      try {
        const response = await fetch('/api/admin/partykit-token', {
          method: 'POST',
          headers: { 'x-admin-session': adminSessionId },
        });

        if (!response.ok) {
          const errorText = await response.text();
          setPresenceDebug(`Realtime auth error: ${response.status} ${errorText}`);
          setAdminPartyKitToken(null);
          return;
        }

        const data = await response.json();
        setAdminPartyKitToken(data.token || null);
      } catch (error) {
        console.error('Error getting PartyKit admin token:', error);
        setPresenceDebug(`Realtime auth error: ${error instanceof Error ? error.message : 'unknown error'}`);
        setAdminPartyKitToken(null);
      }
    };

    fetchAdminToken();

    // Refresh the token every 12 minutes (token TTL is 15 min)
    const refreshInterval = window.setInterval(fetchAdminToken, 12 * 60 * 1000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [adminSessionId, isAdmin, sessionId]);

  // Initialize PartyKit connection
  const {
    isConnected,
    isConnecting,
    users: activeUsers,
    liveConnections,
    currentConnectionId,
    connectionRole,
    error: partyKitError,
    sendCardCreate,
    sendCardUpdate,
    sendCardDelete,
    sendCardReorder,
    sendConnectionCreate,
    sendConnectionDelete,
    sendCursorMove,
    sendPresenceUpdate,
    sendAdminKick,
  } = usePartyKit({
    sessionId: canConnectPartyKit ? partySessionId : null,
    userId: partyUserId,
    userName: partyUserName,
    userColor: partyUserColor,
    adminToken: adminPartyKitToken,
    onCardCreate: (card) => {
      setCards((prev) => {
        // Avoid duplicates
        if (prev.find((c) => c.id === card.id)) return prev;
        return [...prev, card];
      });
      showToast(`${card.section}: New card added by collaborator`);
    },
    onCardUpdate: (cardId, updates) => {
      setCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? { ...card, ...updates } : card
        )
      );
    },
    onCardDelete: (cardId) => {
      setCards((prev) => prev.filter((card) => card.id !== cardId));
      setConnections((prev) =>
        prev.filter((conn) => conn.from !== cardId && conn.to !== cardId)
      );
    },
    onCardReorder: (section, cardIds) => {
      setCards((prev) => {
        const sectionCards = prev.filter((c) => c.section === section);
        const otherCards = prev.filter((c) => c.section !== section);
        const reordered = cardIds
          .map((id) => sectionCards.find((c) => c.id === id))
          .filter(Boolean) as CardData[];
        return [...otherCards, ...reordered];
      });
    },
    onConnectionCreate: (connection) => {
      setConnections((prev) => {
        if (prev.find((c) => c.id === connection.id)) return prev;
        return [...prev, connection];
      });
    },
    onConnectionDelete: (connectionId) => {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    },
    onKicked: (message) => {
      showToast(message);
      setPresenceDebug(message);
    },
  });

  const handleProfileSubmit = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('bbp_user_profile', JSON.stringify(profile));
    localStorage.setItem('bbp_user_id', profile.id);
    setShowProfilePrompt(false);
  };

  // Update presence when user profile changes (for admins or when guest enters name)
  useEffect(() => {
    if (isConnected && userProfile && sendPresenceUpdate) {
      console.log('[App] Updating presence with user profile:', userProfile);
      sendPresenceUpdate({
        id: userProfile.id,
        name: userProfile.name,
        color: userProfile.color,
        lastActive: Date.now(),
      });
    }
  }, [isConnected, userProfile, sendPresenceUpdate]);

  useEffect(() => {
    if (partyKitError?.message) {
      setPresenceDebug(partyKitError.message);
      return;
    }

    if (isAdmin) {
      if (connectionRole === 'admin') {
        setPresenceDebug(`PartyKit live room state: ${liveConnections.length} connected entities`);
      } else if (adminPartyKitToken && connectionRole === 'participant') {
        setPresenceDebug('Admin realtime auth failed; connected without session control privileges');
      } else if (isConnecting) {
        setPresenceDebug('Connecting to PartyKit room...');
      }
      return;
    }

    if (isConnected) {
      setPresenceDebug(`PartyKit live room state: ${liveConnections.length} connected entities`);
    }
  }, [adminPartyKitToken, connectionRole, isAdmin, isConnected, isConnecting, liveConnections.length, partyKitError]);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentSession(data.session);
          
          // If admin, auto-grant access
          if (isAdmin) {
            setIsEditMode(true);
            setCards(data.cards || []);
            setConnections(data.connections || []);
            setProjectData({
              client: data.session.project_client || '',
              background: data.session.project_background || '',
              notes: data.session.project_notes || ''
            });
          } else {
            // For players, check if password is required
            if (data.session.has_password) {
              // Check for saved password
              const savedPassword = sessionStorage.getItem(`session_${sessionId}_password`);
              if (savedPassword) {
                // Verify it
                const verifyResponse = await fetch(`/api/sessions/${sessionId}/verify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: savedPassword })
                });
                if (verifyResponse.ok) {
                  const { valid } = await verifyResponse.json();
                  if (valid) {
                    setIsEditMode(true);
                    setCards(data.cards || []);
                    setConnections(data.connections || []);
                    setProjectData({
                      client: data.session.project_client || '',
                      background: data.session.project_background || '',
                      notes: data.session.project_notes || ''
                    });
                  } else {
                    // Invalid saved password, show wall
                    setShowPasswordWall(true);
                  }
                } else {
                  setShowPasswordWall(true);
                }
              } else {
                // No saved password, show wall
                setShowPasswordWall(true);
              }
            } else {
              // No password required, show content
              setIsEditMode(true);
              setCards(data.cards || []);
              setConnections(data.connections || []);
              setProjectData({
                client: data.session.project_client || '',
                background: data.session.project_background || '',
                notes: data.session.project_notes || ''
              });
            }
          }
        } else {
          showToast('Session not found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
        showToast('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSession();
  }, [sessionId, isAdmin]);

  // Poll for session updates when guest is waiting for onboarding
  useEffect(() => {
    if (!sessionId || isAdmin) return;
    if (currentSession?.onboarding_completed) return;
    if (showPasswordWall) return;

    // Poll every 3 seconds to check if onboarding is complete
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Update session data
          setCurrentSession(data.session);
          
          // If onboarding just completed, load the cards and connections
          if (data.session.onboarding_completed && !currentSession?.onboarding_completed) {
            setCards(data.cards || []);
            setConnections(data.connections || []);
            setProjectData({
              client: data.session.project_client || '',
              background: data.session.project_background || '',
              notes: data.session.project_notes || ''
            });
            showToast('Session is ready! The facilitator has completed setup.');
          }
        }
      } catch (error) {
        console.error('Error polling session:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, isAdmin, currentSession?.onboarding_completed, showPasswordWall]);

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const { valid } = await response.json();
        if (valid) {
          setIsEditMode(true);
          setShowPasswordWall(false);
          sessionStorage.setItem(`session_${sessionId}_password`, password);
          
          // Load session data now that we have access
          const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
          if (sessionResponse.ok) {
            const data = await sessionResponse.json();
            setCards(data.cards || []);
            setConnections(data.connections || []);
            setProjectData({
              client: data.session.project_client || '',
              background: data.session.project_background || '',
              notes: data.session.project_notes || ''
            });
          }
        }
        return valid;
      }
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };

  const handleKickUser = async (connectionId: string, userId?: string | null) => {
    if (!isAdmin || connectionRole !== 'admin') return;

    sendAdminKick(connectionId, userId);
    showToast('Disconnect request sent');
  };

  const completeOnboarding = async () => {
    if (!sessionId || !isAdmin) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete-onboarding`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-session': adminSessionId || ''
        }
      });

      if (response.ok) {
        setCurrentSession(prev => prev ? { ...prev, onboarding_completed: true } : null);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleStartProject = async () => {
    if (!sessionId || !isAdmin) return;
    
    if (!projectData.client && !projectData.background) {
      await completeOnboarding();
      return;
    }
    
    setIsGenerating(true);
    try {
      const generatedCards = await generateCards(
        projectData.client, 
        projectData.background, 
        projectData.notes, 
        selectedModel
      );
      
      // Create cards via API
      for (const card of generatedCards) {
        await fetch(`/api/sessions/${sessionId}/cards`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-session': adminSessionId || ''
          },
          body: JSON.stringify({
            section: card.section,
            content: card.content,
            starred: card.starred
          })
        });
      }
      
      // Reload session to get new cards
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
      
      await completeOnboarding();
    } catch (error: any) {
      console.error("Failed to generate cards", error);
      showToast("Failed to generate cards");
    } finally {
      setIsGenerating(false);
    }
  };

  // Update a card via API and broadcast
  const handleCardUpdate = async (cardId: string, updates: Partial<CardData>) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update card');
      }

      // Broadcast to other users via PartyKit
      sendCardUpdate(cardId, updates);
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  };

  // Add a new card via API and broadcast
  const handleCardAdd = async (cardData: Omit<CardData, 'id'>) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        throw new Error('Failed to create card');
      }

      const data = await response.json();
      
      const newCard: CardData = {
        id: data.card.id,
        section: data.card.section,
        content: cardData.content || data.card.content || '',
        starred: data.card.starred || false,
        order: data.card.order_index
      };

      // Add to local state
      setCards(prev => [...prev, newCard]);

      // Broadcast to other users via PartyKit
      sendCardCreate(newCard);

      return newCard.id;
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  };

  // Delete a card via API and broadcast
  const handleCardDelete = async (cardId: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      // Update local state
      setCards(prev => prev.filter(card => card.id !== cardId));
      setConnections(prev => prev.filter(conn => conn.from !== cardId && conn.to !== cardId));

      // Broadcast to other users via PartyKit
      sendCardDelete(cardId);
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleCardReorder = async (section: string, cardIds: string[]) => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/cards/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        },
        body: JSON.stringify({ section, card_ids: cardIds })
      });
      if (response.ok) {
        sendCardReorder(section, cardIds);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectionCreate = async (from: string, to: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        },
        body: JSON.stringify({ from, to })
      });
      if (response.ok) {
        const data = await response.json();
        setConnections(prev => [...prev, data.connection]);
        sendConnectionCreate(data.connection);
      }
    } catch (error) {
      console.error('Error creating connection', error);
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          ...(isAdmin && adminSessionId ? { 'x-admin-session': adminSessionId } : {})
        }
      });
      if (response.ok) {
        setConnections(prev => prev.filter(c => c.id !== connectionId));
        sendConnectionDelete(connectionId);
      }
    } catch (error) {
      console.error('Error deleting connection', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-gray-700">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600">The session you're looking for doesn't exist.</p>
          <a href="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Show password wall for password-protected sessions
  if (showPasswordWall) {
    return (
      <SessionPasswordWall
        sessionId={currentSession.id}
        sessionName={currentSession.name}
        onVerify={verifyPassword}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden antialiased">
      {/* Profile Prompt */}
      <UserProfilePrompt
        isOpen={showProfilePrompt}
        onSubmit={handleProfileSubmit}
        onClose={() => setShowProfilePrompt(false)}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
        </div>
      )}

        <Sidebar 
        onViewChange={() => {}} 
        currentView="canvas" 
        selectedModel={selectedModel} 
        onModelChange={setSelectedModel}
        sessions={[]} 
        currentSession={currentSession}
        isEditMode={isEditMode}
        onLogout={() => {}}
        isAdmin={isAdmin}
        activeConnections={liveConnections}
        currentConnectionId={currentConnectionId || ''}
        onKickUser={connectionRole === 'admin' ? handleKickUser : undefined}
        presenceDebug={presenceDebug}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar 
          projectName={currentSession.name}
          rightContent={
            isAdmin && (
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                Exit Session
              </button>
            )
          }
        >
          <div className="flex items-center gap-3">
            <ActiveUsers users={activeUsers} currentUserId={userProfile?.id || ''} />
            <ConnectionStatus isConnected={isConnected} isConnecting={isConnecting} message={partyKitError?.message} />
            {!isAdmin && (
              <button 
                onClick={handleExitSession}
                className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors shadow-sm"
              >
                Exit
              </button>
            )}
          </div>
        </TopBar>
        <div className="flex flex-1 overflow-hidden relative">
          <main className="flex-1 overflow-auto relative bg-gray-50/30">
            {/* Show onboarding if not completed (admin only) */}
            {!currentSession.onboarding_completed && isAdmin ? (
              <NewProject 
                onStart={handleStartProject} 
                projectData={projectData}
                setProjectData={setProjectData}
                isGenerating={isGenerating}
              />
            ) : !currentSession.onboarding_completed && !isAdmin ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
                  <div className="text-5xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Setup in Progress</h2>
                  <p className="text-gray-600">
                    The facilitator is currently setting up this session. 
                    Please check back later.
                  </p>
                  <div className="mt-4 text-sm text-gray-500">
                    Session: <span className="font-mono">{currentSession.id}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Canvas
                  onSelectCard={setSelectedCard}
                  selectedCard={selectedCard}
                  cards={cards}
                  setCards={setCards}
                  connections={connections}
                  projectData={projectData}
                  showToast={showToast}
                  selectedModel={selectedModel}
                  isEditMode={isEditMode}
                  currentSession={currentSession}
                  onCardUpdate={handleCardUpdate}
                  onCardAdd={handleCardAdd}
                  onCardDelete={handleCardDelete}
                  onCardReorder={handleCardReorder}
                  onConnectionCreate={handleConnectionCreate}
                  onConnectionDelete={handleConnectionDelete}
                  onCursorMove={sendCursorMove}
                  activeUsers={activeUsers}
                  currentUserId={userProfile?.id || ''}
                />
              </>
            )}
          </main>
          <RightPanel 
            selectedCard={selectedCard} 
            currentView="canvas" 
            cards={cards} 
            projectData={projectData} 
            selectedModel={selectedModel}
            currentSession={currentSession}
            isEditMode={isEditMode}
          />
        </div>
      </div>
    </div>
  );
}
