import React, { useState } from 'react';
import { Lock, Loader2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ onClose, forced = false }: { onClose?: () => void; forced?: boolean }) {
  const { currentUser } = useAuthStore();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // We need to bypass if there's no user, but this shouldn't render then
  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      toast.error('Please fill in both fields');
      return;
    }
    if (newPass.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch({
        action: 'users.changePassword',
        oldPassword: currentPass,
        newPassword: newPass
      });
      toast.success('Password changed successfully');
      
      // Update local state to remove the force flag
      const { updateUser } = useAuthStore.getState();
      updateUser({ mustChangePassword: false });
      
      if (!forced) {
         onClose?.();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-[#1f1f1f] shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1f1f1f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {forced ? 'Update Required' : 'Change Password'}
            </h2>
          </div>
          {!forced && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {forced && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              For security reasons, you must change your temporary password before continuing.
            </p>
          )}
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-[#9ca3af]">Current Password</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-[#b61615] focus:outline-none transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-[#9ca3af]">New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-[#b61615] focus:outline-none transition-colors"
              minLength={8}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#b61615] hover:bg-[#a01312] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
