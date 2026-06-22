import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { App } from './App';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

// LoginPage is statically imported as it's the entry point
import { LoginPage } from './pages/LoginPage';

// Lazy-loaded page components for code splitting
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const ChangePasswordPage = React.lazy(() => import('./pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
const DamageReportDetailPage = React.lazy(() => import('./pages/damage-reports/DamageReportDetailPage').then(m => ({ default: m.DamageReportDetailPage })));

const MaintenanceAssetHistoryPage = React.lazy(() => import('./pages/maintenance/MaintenanceAssetHistoryPage').then(m => ({ default: m.MaintenanceAssetHistoryPage })));
const ManagerDashboardPage = React.lazy(() => import('./pages/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const InventoryCheckPrintPreviewPage = React.lazy(() => import('./pages/print/InventoryCheckPrintPreviewPage').then(m => ({ default: m.InventoryCheckPrintPreviewPage })));
const StudentDashboardPage = React.lazy(() => import('./pages/StudentDashboardPage').then(m => ({ default: m.StudentDashboardPage })));
const AuditLogsPage = React.lazy(() => import('./pages/admin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const UsersManagementPage = React.lazy(() => import('./pages/admin/UsersManagementPage').then(m => ({ default: m.UsersManagementPage })));
const AssetCategoriesManagementPage = React.lazy(() => import('./pages/admin/AssetCategoriesManagementPage').then(m => ({ default: m.AssetCategoriesManagementPage })));
const AssetsManagementPage = React.lazy(() => import('./pages/admin/AssetsManagementPage').then(m => ({ default: m.AssetsManagementPage })));
const LocationsManagementPage = React.lazy(() => import('./pages/admin/LocationsManagementPage').then(m => ({ default: m.LocationsManagementPage })));
const RoomStudentsManagementPage = React.lazy(() => import('./pages/admin/RoomStudentsManagementPage').then(m => ({ default: m.RoomStudentsManagementPage })));
const RoomsManagementPage = React.lazy(() => import('./pages/admin/RoomsManagementPage').then(m => ({ default: m.RoomsManagementPage })));
const InventoryChecksManagementPage = React.lazy(() => import('./pages/manager/InventoryChecksManagementPage').then(m => ({ default: m.InventoryChecksManagementPage })));
const EquipmentTransactionsPage = React.lazy(() => import('./pages/manager/EquipmentTransactionsPage').then(m => ({ default: m.EquipmentTransactionsPage })));
const ImportEquipmentPage = React.lazy(() => import('./pages/manager/ImportEquipmentPage').then(m => ({ default: m.ImportEquipmentPage })));
const ExportEquipmentPage = React.lazy(() => import('./pages/manager/ExportEquipmentPage').then(m => ({ default: m.ExportEquipmentPage })));
const LiquidationRecordsManagementPage = React.lazy(() => import('./pages/manager/LiquidationRecordsManagementPage').then(m => ({ default: m.LiquidationRecordsManagementPage })));
const MaintenanceManagementPage = React.lazy(() => import('./pages/manager/MaintenanceManagementPage').then(m => ({ default: m.MaintenanceManagementPage })));
const MaintenanceRecordCreatePage = React.lazy(() => import('./pages/manager/MaintenanceRecordCreatePage').then(m => ({ default: m.MaintenanceRecordCreatePage })));
const DamageReportsManagementPage = React.lazy(() => import('./pages/manager/DamageReportsManagementPage').then(m => ({ default: m.DamageReportsManagementPage })));
const StudentDamageReportsHistoryPage = React.lazy(() => import('./pages/student/StudentDamageReportsHistoryPage').then(m => ({ default: m.StudentDamageReportsHistoryPage })));
const StudentRoomAssetsPage = React.lazy(() => import('./pages/student/StudentRoomAssetsPage').then(m => ({ default: m.StudentRoomAssetsPage })));
const StudentRoomPage = React.lazy(() => import('./pages/student/StudentRoomPage').then(m => ({ default: m.StudentRoomPage })));

// Shared loading fallback for Suspense
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

function SuspenseLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

const adminChildren = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <AdminDashboardPage /> },
  { path: 'users', element: <UsersManagementPage /> },
  { path: 'audit-logs', element: <AuditLogsPage /> },
  { path: 'profile', element: <ProfilePage /> },
  { path: 'change-password', element: <ChangePasswordPage /> },
];

const managerChildren = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <ManagerDashboardPage /> },
  { path: 'locations', element: <LocationsManagementPage /> },
  { path: 'rooms', element: <RoomsManagementPage /> },
  { path: 'room-students', element: <RoomStudentsManagementPage /> },
  { path: 'asset-categories', element: <AssetCategoriesManagementPage /> },
  { path: 'assets', element: <AssetsManagementPage /> },
  { path: 'damage-reports', element: <DamageReportsManagementPage /> },
  { path: 'damage-reports/:id', element: <DamageReportDetailPage /> },
  { path: 'maintenance', element: <MaintenanceManagementPage /> },
  { path: 'maintenance/records/new', element: <MaintenanceRecordCreatePage /> },
  { path: 'maintenance/assets/:assetId/history', element: <MaintenanceAssetHistoryPage /> },          { path: 'inventory-checks', element: <InventoryChecksManagementPage /> },
  { path: 'inventory-checks/:id/print', element: <InventoryCheckPrintPreviewPage /> },
  { path: 'liquidations', element: <LiquidationRecordsManagementPage /> },
  { path: 'asset-transactions', element: <EquipmentTransactionsPage /> },
  { path: 'asset-transactions/import', element: <ImportEquipmentPage /> },
  { path: 'asset-transactions/export', element: <ExportEquipmentPage /> },
  { path: 'profile', element: <ProfilePage /> },
  { path: 'change-password', element: <ChangePasswordPage /> },
];

const studentChildren = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <StudentDashboardPage /> },
  { path: 'room', element: <StudentRoomPage /> },
  { path: 'room-assets', element: <StudentRoomAssetsPage /> },
  { path: 'damage-reports', element: <StudentDamageReportsHistoryPage /> },
  { path: 'damage-reports/:id', element: <DamageReportDetailPage /> },
  { path: 'profile', element: <ProfilePage /> },
  { path: 'change-password', element: <ChangePasswordPage /> },
];

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <SuspenseLayout />,
        children: [
          { path: '/print/inventory/:id', element: <InventoryCheckPrintPreviewPage /> },
          {
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [{ path: '/admin', element: <DashboardLayout />, children: adminChildren }],
          },
          {
            element: <RoleRoute allowedRoles={['MANAGER']} />,
            children: [{ path: '/manager', element: <DashboardLayout />, children: managerChildren }],
          },
          {
            element: <RoleRoute allowedRoles={['STUDENT']} />,
            children: [{ path: '/student', element: <DashboardLayout />, children: studentChildren }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
