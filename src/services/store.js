"use client";

const INITIAL_STORE = {
  activeTenantId: '',
  activeBranchId: '',
  activeRole: 'superadmin',
  tenants: [],
  branches: [],
  categories: [],
  menuItems: [],
  tables: [],
  staff: [],
  orders: [],
  ingredients: []
};

export function getInitialStore() {
  return JSON.parse(JSON.stringify(INITIAL_STORE));
}
