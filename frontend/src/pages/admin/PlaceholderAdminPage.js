import React from 'react';
import { PageHeader, Panel } from './shared';

const PlaceholderAdminPage = ({ title }) => (
  <div>
    <PageHeader title={title} description="This module is scheduled after Phase 1. Existing working functionality remains available while modules are migrated incrementally." />
    <Panel className="p-6 text-sm font-semibold text-slate-600">Phase 1 is focused on Executive Dashboard, User Management, Roles & Permissions, Reporting Hierarchy, Escalation Matrix and Audit Logs.</Panel>
  </div>
);

export default PlaceholderAdminPage;
