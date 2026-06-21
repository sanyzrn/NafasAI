import { Shield, Check, X } from 'lucide-react';
import { Permission } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface RoleDef {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

const ROLES: RoleDef[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full platform access including user management, system settings, and all AI tools.',
    permissions: ['chat', 'image_generation', 'research', 'code_assistant', 'summarization', 'admin_panel', 'user_management', 'system_settings'],
    userCount: 1,
  },
  {
    id: 'manager',
    name: 'Department Manager',
    description: 'Access to most AI tools for decision-making, reporting, and team collaboration.',
    permissions: ['chat', 'image_generation', 'research', 'summarization'],
    userCount: 2,
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Core AI tools suited for day-to-day tasks. Permissions can vary per user.',
    permissions: ['chat', 'summarization'],
    userCount: 3,
  },
];

const ALL_PERMISSIONS: { id: Permission; label: string; description: string; category: string }[] = [
  { id: 'chat', label: 'AI Chat', description: 'General conversational AI', category: 'Tools' },
  { id: 'research', label: 'Research Assistant', description: 'In-depth research tool', category: 'Tools' },
  { id: 'code_assistant', label: 'Code Assistant', description: 'AI coding support', category: 'Tools' },
  { id: 'summarization', label: 'Summarization', description: 'Text and doc summarizer', category: 'Tools' },
  { id: 'admin_panel', label: 'Admin Panel', description: 'View admin dashboard', category: 'Admin' },
  { id: 'user_management', label: 'User Management', description: 'Create/edit/disable users', category: 'Admin' },
  { id: 'system_settings', label: 'System Settings', description: 'Modify platform settings', category: 'Admin' },
];

export default function RolesPermissions() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d]">
      <div className="px-8 py-5 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-0.5">
          <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-[#9ca3af]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Roles & Permissions</h1>
        </div>
        <p className="text-xs text-gray-400 dark:text-[#4b5563] ml-10">Default access levels for each role</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-[#1f1f1f]">
          <div className="w-1 h-1 rounded-full bg-[#b61615] mt-2 flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-[#6b7280] leading-relaxed">
            These are default role permissions. Individual user permissions can be overridden in{' '}
            <span className="text-gray-800 dark:text-[#9ca3af] font-medium">User Management</span>.
          </p>
        </div>

        {/* Permission matrix */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-100 dark:border-[#1f1f1f] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-[#6b7280] uppercase tracking-wider">Permission Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0d0d0d]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider w-64">Permission</th>
                  {ROLES.map((role) => (
                    <th key={role.id} className="text-center px-6 py-3 text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider">
                      {role.name.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Tools', 'Admin'].map((category) => {
                  const perms = ALL_PERMISSIONS.filter((p) => p.category === category);
                  return (
                    <>
                      <tr key={category} className="border-t border-gray-100 dark:border-[#1a1a1a]">
                        <td colSpan={4} className="px-5 py-2 bg-gray-50 dark:bg-[#0d0d0d]">
                          <span className="text-xs font-semibold text-gray-400 dark:text-[#374151] uppercase tracking-wider">{category}</span>
                        </td>
                      </tr>
                      {perms.map((perm) => (
                        <tr key={perm.id} className="border-t border-gray-50 dark:border-[#161616] hover:bg-gray-50 dark:hover:bg-[#111111] transition">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800 dark:text-white text-sm">{perm.label}</p>
                            <p className="text-xs text-gray-400 dark:text-[#4b5563] mt-0.5">{perm.description}</p>
                          </td>
                          {ROLES.map((role) => (
                            <td key={role.id} className="px-6 py-3 text-center">
                              {role.permissions.includes(perm.id) ? (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded-full bg-[#b61615]/10 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-[#b61615]" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
                                    <X className="w-3 h-3 text-gray-300 dark:text-[#374151]" />
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 dark:text-[#4b5563] uppercase tracking-wider mb-3">Role Definitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ROLES.map((role, idx) => (
              <div
                key={role.id}
                className={cn(
                  'rounded-xl border p-5',
                  idx === 0
                    ? 'border-[#b61615]/30 bg-[#b61615]/5 dark:bg-[#b61615]/5'
                    : 'border-gray-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111]'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className={cn('font-semibold text-sm', idx === 0 ? 'text-[#b61615]' : 'text-gray-900 dark:text-white')}>
                    {role.name}
                  </h4>
                  <span className="text-xs text-gray-400 dark:text-[#4b5563]">{role.userCount} users</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#6b7280] leading-relaxed mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 4).map((perm) => {
                    const p = ALL_PERMISSIONS.find((ap) => ap.id === perm);
                    return (
                      <span
                        key={perm}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-md font-medium border',
                          idx === 0
                            ? 'border-[#b61615]/20 text-[#b61615] bg-[#b61615]/5'
                            : 'border-gray-100 dark:border-[#2a2a2a] text-gray-500 dark:text-[#6b7280] bg-gray-50 dark:bg-[#1a1a1a]'
                        )}
                      >
                        {p?.label}
                      </span>
                    );
                  })}
                  {role.permissions.length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded-md text-gray-400 dark:text-[#4b5563]">
                      +{role.permissions.length - 4}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
