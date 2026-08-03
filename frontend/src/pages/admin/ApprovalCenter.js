import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileCheck2 } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const readData = (response) => response?.data?.data || response?.data || {};

const ApprovalCenter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    pendingActions: [],
    escalations: [],
    hosts: [],
    properties: [],
    bookings: [],
  });

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError('');
    const [dashboard, escalations, hosts, properties, bookings] = await Promise.allSettled([
      adminPhase1API.dashboard(),
      adminPhase1API.activeEscalations(),
      adminPhase1API.hosts({ status: 'pending', limit: 10 }),
      adminPhase1API.propertyOperations({ status: 'pending_review', limit: 10 }),
      adminPhase1API.bookingOperations({ status: 'pending', limit: 10 }),
    ]);

    const dashboardData = dashboard.status === 'fulfilled' ? readData(dashboard.value) : {};
    const escalationData = escalations.status === 'fulfilled' ? readData(escalations.value) : {};
    const hostData = hosts.status === 'fulfilled' ? readData(hosts.value) : {};
    const propertyData = properties.status === 'fulfilled' ? readData(properties.value) : {};
    const bookingData = bookings.status === 'fulfilled' ? readData(bookings.value) : {};

    if ([dashboard, escalations, hosts, properties, bookings].every((result) => result.status === 'rejected')) {
      setError('Failed to load Approval Center');
    }

    setData({
      pendingActions: dashboardData.pending_actions || dashboardData.pendingActions || [],
      escalations: escalationData.instances || escalationData.escalations || [],
      hosts: hostData.hosts || [],
      properties: propertyData.properties || [],
      bookings: bookingData.bookings || [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const queues = useMemo(() => [
    {
      label: 'Pending Actions',
      count: data.pendingActions.length,
      icon: Clock,
      status: data.pendingActions.length ? 'pending' : 'clear',
    },
    {
      label: 'Active Escalations',
      count: data.escalations.length,
      icon: AlertTriangle,
      status: data.escalations.length ? 'critical' : 'clear',
    },
    {
      label: 'Host Reviews',
      count: data.hosts.length,
      icon: FileCheck2,
      status: data.hosts.length ? 'pending' : 'clear',
    },
    {
      label: 'Property Reviews',
      count: data.properties.length,
      icon: CheckCircle2,
      status: data.properties.length ? 'pending' : 'clear',
    },
  ], [data]);

  const approvalRows = useMemo(() => {
    const actions = data.pendingActions.map((action, index) => ({
      id: action.id || `action-${index}`,
      module: action.module || action.type || 'Admin Action',
      title: action.title || action.label || action.name || 'Pending approval',
      owner: action.owner || action.assignee || 'Admin Team',
      status: action.status || 'pending',
      path: action.path || '/admin/dashboard',
    }));

    const escalations = data.escalations.slice(0, 8).map((item, index) => ({
      id: item.id || item._id || `escalation-${index}`,
      module: item.module || 'Escalation',
      title: item.title || item.subject || item.reason || 'Escalation review required',
      owner: item.assigned_to_name || item.assignee || 'Escalation Owner',
      status: item.status || 'critical',
      path: '/admin/escalation-matrix',
    }));

    return [...actions, ...escalations];
  }, [data.escalations, data.pendingActions]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Approval Center"
        description="Central queue for pending admin reviews, escalations and operational approvals across X-Space360."
      />

      {error && <ErrorState message={error} />}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {queues.map((queue) => {
          const Icon = queue.icon;
          return (
            <Panel key={queue.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{queue.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{queue.count}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2563eb]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <StatusBadge value={queue.status} />
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-black text-slate-950">Approval Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvalRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.module}</td>
                  <td className="px-4 py-3 text-slate-700">{row.title}</td>
                  <td className="px-4 py-3 text-slate-700">{row.owner}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <a className="text-sm font-bold text-[#2563eb] hover:underline" href={row.path}>Open</a>
                  </td>
                </tr>
              ))}
              {!approvalRows.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                    No pending approval items.
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

export default ApprovalCenter;
