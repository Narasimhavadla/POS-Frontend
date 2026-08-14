"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

// Screen Components
import CashierPOSScreen from "@/components/dashboards/CashierPOSScreen";
import KDSScreen from "@/components/dashboards/KDSScreen";
import TablesQRScreen from "@/components/dashboards/TablesQRScreen";
import InventoryScreen from "@/components/dashboards/InventoryScreen";
import StaffScreen from "@/components/dashboards/StaffScreen";
import OwnerScreen from "@/components/dashboards/OwnerScreen";
import SuperAdminScreen from "@/components/dashboards/SuperAdminScreen";
import PermissionMatrixScreen from "@/components/dashboards/PermissionMatrixScreen";
import RestaurantSettingsScreen from "@/components/dashboards/RestaurantSettingsScreen";
import WaiterDashboard from "@/components/dashboards/WaiterDashboard";
import TableOrderingScreen from "@/components/dashboards/TableOrderingScreen";
import MenuBuilderScreen from "@/components/dashboards/MenuBuilderScreen";
import OrderHistoryScreen from "@/components/dashboards/OrderHistoryScreen";
import ReportsFinancialsScreen from "@/components/dashboards/ReportsFinancialsScreen";
import AuditLogsScreen from "@/components/dashboards/AuditLogsScreen";
import MyAttendanceScreen from "@/components/dashboards/MyAttendanceScreen";

export default function DashboardPage() {
  const { user, activeScreen, isAuthLoading } = useAuth();

  // Only redirect if hydration is complete and user is still null
  useEffect(() => {
    if (!isAuthLoading && !user && typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [user, isAuthLoading]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FFFBF0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#FF5B32] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-600 font-bold text-xs uppercase tracking-wider">Loading SmartServe Terminal…</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "pos":            return <CashierPOSScreen />;
      case "kds":            return <KDSScreen />;
      case "tables_qr":      return <TablesQRScreen />;
      case "waiter":         return <WaiterDashboard />;
      case "table_ordering": return <TableOrderingScreen />;
      case "order_history":  return <OrderHistoryScreen />;
      case "menu_builder":   return <MenuBuilderScreen />;
      case "inventory":      return <InventoryScreen />;
      case "staff":          return <StaffScreen />;
      case "audit_logs":     return <AuditLogsScreen />;
      case "owner":          return <OwnerScreen />;
      case "permissions":    return <PermissionMatrixScreen />;
      case "reports":        return <ReportsFinancialsScreen />;
      case "settings":       return <RestaurantSettingsScreen />;
      case "my_attendance":  return <MyAttendanceScreen />;
      case "saas_tenants":       return <SuperAdminScreen initialTab="tenants" />;
      case "saas_register":      return <SuperAdminScreen initialTab="register" />;
      case "saas_subscriptions": return <SuperAdminScreen initialTab="subscriptions" />;
      case "saas_analytics":     return <SuperAdminScreen initialTab="analytics" />;
      case "superadmin":         return <SuperAdminScreen initialTab="tenants" />;
      default:                   return <SuperAdminScreen initialTab="tenants" />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50 font-sans" suppressHydrationWarning>
      {/* Top Dashboard Header */}
      <DashboardHeader />

      {/* Body: Sidebar + Screen Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Pane */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden p-4">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}
