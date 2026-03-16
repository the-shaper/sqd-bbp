import React, { useState, useEffect } from 'react';

const COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
];

interface UserProfile {
  id: string;
  name: string;
  color: string;
}

interface UserProfilePromptProps {
  isOpen: boolean;
  onSubmit: (profile: UserProfile) => void;
  onClose?: () => void;
}

export function UserProfilePrompt({ isOpen, onSubmit, onClose }: UserProfilePromptProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[6]); // Default to Blue
  const [error, setError] = useState('');

  // Load saved profile on mount
  useEffect(() => {
    const saved = localStorage.getItem('bbp_user_profile');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        setName(profile.name || '');
        setSelectedColor(profile.color || COLORS[6]);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const profile: UserProfile = {
      id: localStorage.getItem('bbp_user_id') || generateUserId(),
      name: name.trim(),
      color: selectedColor,
    };

    // Save to localStorage
    localStorage.setItem('bbp_user_profile', JSON.stringify(profile));
    localStorage.setItem('bbp_user_id', profile.id);
    
    onSubmit(profile);
  };

  const generateUserId = () => {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-2xl font-bold text-gray-900">Join Collaboration</h2>
          <p className="text-gray-600 mt-2">
            Enter your name to collaborate with others in real-time
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Your Color
            </label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Join Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function to get or create user profile
export function getUserProfile(): UserProfile | null {
  const saved = localStorage.getItem('bbp_user_profile');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export type { UserProfile };
