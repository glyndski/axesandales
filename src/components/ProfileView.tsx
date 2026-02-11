import React, { useState } from 'react';
import { User } from '../types';
import { changePassword } from '../services/firebaseService';

interface ProfileViewProps {
  user: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters long.');

    try {
        await changePassword(newPassword);
        setSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
    } catch (err: any) {
        setError("Failed to update password. You may need to logout and login again.");
        console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 shadow-xl">
        <h2 className="text-2xl font-bold text-amber-500 mb-4">My Profile</h2>
        <div className="space-y-3 bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
          <div className="flex justify-between items-center"><span className="text-neutral-400">Display Name:</span><span className="font-medium text-white">{user.name}</span></div>
          <div className="flex justify-between items-center"><span className="text-neutral-400">Email:</span><span className="font-medium text-white">{user.email}</span></div>
          <div className="flex justify-between items-center"><span className="text-neutral-400">Membership Status:</span>
            {user.isAdmin
              ? <span className="text-xs text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded-full border border-amber-800">Admin</span>
              : user.isMember
                ? <span className="text-xs text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full border border-green-800">Paid Member</span>
                : <span className="text-xs text-orange-400 bg-orange-900/50 px-2 py-0.5 rounded-full border border-orange-800">Unpaid Member</span>}
          </div>
        </div>
        {!user.isMember && !user.isAdmin && (
          <div className="mt-4 bg-amber-900/20 border border-amber-700/40 rounded-lg p-4">
            <p className="text-amber-300 text-sm font-medium">Your membership is currently unpaid.</p>
            <p className="text-neutral-400 text-xs mt-1">Once an admin confirms your payment and activates your membership, you'll be able to book tables and access all club features.</p>
          </div>
        )}
        <div className="mt-6">
            <h3 className="text-lg font-bold text-white mb-3">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4 bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                <div><label className="block text-sm text-neutral-400 mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white" /></div>
                 <div><label className="block text-sm text-neutral-400 mb-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white" /></div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {success && <p className="text-sm text-green-400">{success}</p>}
                <button type="submit" className="w-full md:w-auto mt-2 px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-bold shadow-lg shadow-amber-900/20 text-sm">Update Password</button>
            </form>
        </div>
      </div>
    </div>
  );
};