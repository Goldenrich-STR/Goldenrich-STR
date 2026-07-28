import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ShieldCheck, Users } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const getUsers = (response) => response?.data?.data?.users || response?.data?.users || [];

const Departments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminPhase1API.users({ limit: 500 });
      setUsers(getUsers(response));
    } catch (err) {
      setError('Failed to load Departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const departments = useMemo(() => {
    const grouped = new Map();

    users.forEach((user) => {
      const name = user.department || user.branch || 'Unassigned';
      const current = grouped.get(name) || {
        name,
        total: 0,
        active: 0,
        admins: 0,
        managers: 0,
        employees: [],
        roles: new Set(),
      };

      current.total += 1;
      if (String(user.status || '').toLowerCase() === 'active') current.active += 1;
      if (String(user.role || '').toLowerCase().includes('admin')) current.admins += 1;
      if (user.reporting_manager_id || user.manager_id) current.managers += 1;
      current.roles.add(user.role || 'employee');
      current.employees.push(user);
      grouped.set(name, current);
    });

    return Array.from(grouped.values())
      .map((department) => ({
        ...department,
        roles: Array.from(department.roles),
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [users]);

  const metrics = useMemo(() => ({
    departments: departments.length,
    users: users.length,
    activeUsers: users.filter((user) => String(user.status || '').toLowerCase() === 'active').length,
    admins: users.filter((user) => String(user.role || '').toLowerCase().includes('admin')).length,
  }), [departments.length, users]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Review team structure, headcount, role coverage and active user distribution across departments."
      />

      {error && <ErrorState message={error} />}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Departments', value: metrics.departments, icon: BriefcaseBusiness },
          { label: 'Total Users', value: metrics.users, icon: Users },
          { label: 'Active Users', value: metrics.activeUsers, icon: ShieldCheck },
          { label: 'Admin Users', value: metrics.admins, icon: ShieldCheck },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Panel key={metric.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
                </div>
                <Icon className="h-5 w-5 text-terracotta" />
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-black text-slate-950">Department Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Headcount</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Role Coverage</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => (
                <tr key={department.name}>
                  <td className="px-4 py-3 font-bold text-slate-900">{department.name}</td>
                  <td className="px-4 py-3 text-slate-700">{department.total}</td>
                  <td className="px-4 py-3 text-slate-700">{department.active}</td>
                  <td className="px-4 py-3 text-slate-700">{department.roles.join(', ')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={department.active > 0 ? 'active' : 'inactive'} />
                  </td>
                </tr>
              ))}
              {!departments.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                    No department data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default Departments;
