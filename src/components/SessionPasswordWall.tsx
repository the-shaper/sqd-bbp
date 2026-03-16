/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Unlock, Loader2, Shield } from 'lucide-react';

interface SessionPasswordWallProps {
  sessionId: string;
  sessionName: string;
  onVerify: (password: string) => Promise<boolean>;
}

export default function SessionPasswordWall({ sessionId, sessionName, onVerify }: SessionPasswordWallProps) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter the session password');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await onVerify(password);
      if (!isValid) {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-8 py-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Password Protected</h1>
          <p className="text-indigo-100 mt-1">Enter password to view this session</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <div className="font-semibold text-lg text-gray-900">{sessionName}</div>
            <div className="text-sm text-gray-500 font-mono">{sessionId}</div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                  disabled={isVerifying}
                  autoFocus
                />
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Unlock size={18} />
                  Unlock Session
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              This session is password protected.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Contact the session facilitator for the password.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <a 
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
