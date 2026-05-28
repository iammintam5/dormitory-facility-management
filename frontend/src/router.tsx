import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HandoverDetailPage } from './pages/handovers/HandoverDetailPage';
import { HandoverPrintPage } from './pages/handovers/HandoverPrintPage';
import { InventoryCheckDetailPage } from './pages/inventory-checks/InventoryCheckDetailPage';
import { InventoryCheckPrintPage } from './pages/inventory-checks/InventoryCheckPrintPage';
import { LoginPage } from './pages/LoginPage';
import { MaintenanceAssetHistoryPage } from './pages/maintenance/MaintenanceAssetHistoryPage';
import { MaintenanceRecordPrintPage } from './pages/maintenance/MaintenanceRecordPrintPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DamageReportPrintPreviewPage } from './pages/print/DamageReportPrintPreviewPage';
import { HandoverPrintPreviewPage } from './pages/print/HandoverPrintPreviewPage';
import { InventoryCheckPrintPreviewPage } from './pages/print/InventoryCheckPrintPreviewPage';
import { LiquidationRecordPrintPreviewPage } from './pages/print/LiquidationRecordPrintPreviewPage';
import { MaintenanceRecordPrintPreviewPage } from './pages/print/MaintenanceRecordPrintPreviewPage';
import { LiquidationRecordDetailPage } from './pages/liquidation-records/LiquidationRecordDetailPage';
import { LiquidationRecordPrintPage } from './pages/liquidation-records/LiquidationRecordPrintPage';
import { DamageReportDetailPage } from './pages/damage-reports/DamageReportDetailPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { AssetCategoriesManagementPage } from './pages/admin/AssetCategoriesManagementPage';
import { AssetsManagementPage } from './pages/admin/AssetsManagementPage';
import { LocationsManagementPage } from './pages/admin/LocationsManagementPage';
import { UsersManagementPage } from './pages/admin/UsersManagementPage';
import { InventoryCheckCreatePage } from './pages/manager/InventoryCheckCreatePage';
import { InventoryChecksManagementPage } from './pages/manager/InventoryChecksManagementPage';
import { MaintenanceManagementPage } from './pages/manager/MaintenanceManagementPage';
import { MaintenanceRecordCreatePage } from './pages/manager/MaintenanceRecordCreatePage';
import { LiquidationRecordsManagementPage } from './pages/manager/LiquidationRecordsManagementPage';
import { HandoverCreatePage } from './pages/manager/HandoverCreatePage';
import { HandoversManagementPage } from './pages/admin/HandoversManagementPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { DamageReportsManagementPage } from './pages/manager/DamageReportsManagementPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { StudentCreateDamageReportPage } from './pages/student/StudentCreateDamageReportPage';
import { StudentDamageReportsHistoryPage } from './pages/student/StudentDamageReportsHistoryPage';
import { StudentHandoversPage } from './pages/student/StudentHandoversPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/print/handover/:id',
        element: <HandoverPrintPreviewPage />,
      },
      {
        path: '/print/inventory/:id',
        element: <InventoryCheckPrintPreviewPage />,
      },
      {
        path: '/print/damage-report/:id',
        element: <DamageReportPrintPreviewPage />,
      },
      {
        path: '/print/liquidation/:id',
        element: <LiquidationRecordPrintPreviewPage />,
      },
      {
        path: '/print/maintenance/:id',
        element: <MaintenanceRecordPrintPreviewPage />,
      },
      {
        element: <RoleRoute allowedRoles={['ADMIN']} />,
        children: [
          {
            path: '/admin',
            element: <DashboardLayout />,
            children: [
              {
                path: 'dashboard',
                element: <AdminDashboardPage />,
              },
              {
                path: 'users',
                element: <UsersManagementPage />,
              },
              {
                path: 'locations',
                element: <LocationsManagementPage />,
              },
              {
                path: 'asset-categories',
                element: <AssetCategoriesManagementPage />,
              },
              {
                path: 'assets',
                element: <AssetsManagementPage />,
              },
              {
                path: 'handovers',
                element: <HandoversManagementPage />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'audit-logs',
                element: <AuditLogsPage />,
              },
              {
                path: 'maintenance',
                element: <MaintenanceManagementPage />,
              },
              {
                path: 'maintenance/records/new',
                element: <MaintenanceRecordCreatePage />,
              },
              {
                path: 'maintenance/assets/:assetId/history',
                element: <MaintenanceAssetHistoryPage />,
              },
              {
                path: 'maintenance/records/:id/print',
                element: <MaintenanceRecordPrintPage />,
              },
              {
                path: 'liquidations',
                element: <LiquidationRecordsManagementPage />,
              },
              {
                path: 'liquidations/:id',
                element: <LiquidationRecordDetailPage />,
              },
              {
                path: 'liquidations/:id/print',
                element: <LiquidationRecordPrintPage />,
              },
              {
                path: 'inventory-checks',
                element: <InventoryChecksManagementPage />,
              },
              {
                path: 'inventory-checks/new',
                element: <InventoryCheckCreatePage />,
              },
              {
                path: 'inventory-checks/:id',
                element: <InventoryCheckDetailPage />,
              },
              {
                path: 'inventory-checks/:id/print',
                element: <InventoryCheckPrintPage />,
              },
              {
                path: 'damage-reports',
                element: <DamageReportsManagementPage />,
              },
              {
                path: 'damage-reports/:id',
                element: <DamageReportDetailPage />,
              },
              {
                path: 'handovers',
                element: <HandoversManagementPage />,
              },
              {
                path: 'handovers/new',
                element: <HandoverCreatePage />,
              },
              {
                path: 'handovers/:id',
                element: <HandoverDetailPage />,
              },
              {
                path: 'handovers/:id/print',
                element: <HandoverPrintPage />,
              },
            ],
          },
        ],
      },
      {
        element: <RoleRoute allowedRoles={['QL_CSVC']} />,
        children: [
          {
            path: '/manager',
            element: <DashboardLayout />,
            children: [
              {
                path: 'dashboard',
                element: <ManagerDashboardPage />,
              },
              {
                path: 'locations',
                element: <LocationsManagementPage />,
              },
              {
                path: 'asset-categories',
                element: <AssetCategoriesManagementPage />,
              },
              {
                path: 'assets',
                element: <AssetsManagementPage />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'maintenance',
                element: <MaintenanceManagementPage />,
              },
              {
                path: 'maintenance/records/new',
                element: <MaintenanceRecordCreatePage />,
              },
              {
                path: 'maintenance/assets/:assetId/history',
                element: <MaintenanceAssetHistoryPage />,
              },
              {
                path: 'maintenance/records/:id/print',
                element: <MaintenanceRecordPrintPage />,
              },
              {
                path: 'liquidations',
                element: <LiquidationRecordsManagementPage />,
              },
              {
                path: 'liquidations/:id',
                element: <LiquidationRecordDetailPage />,
              },
              {
                path: 'liquidations/:id/print',
                element: <LiquidationRecordPrintPage />,
              },
              {
                path: 'inventory-checks',
                element: <InventoryChecksManagementPage />,
              },
              {
                path: 'inventory-checks/new',
                element: <InventoryCheckCreatePage />,
              },
              {
                path: 'inventory-checks/:id',
                element: <InventoryCheckDetailPage />,
              },
              {
                path: 'inventory-checks/:id/print',
                element: <InventoryCheckPrintPage />,
              },
              {
                path: 'damage-reports',
                element: <DamageReportsManagementPage />,
              },
              {
                path: 'damage-reports/:id',
                element: <DamageReportDetailPage />,
              },
              {
                path: 'handovers',
                element: <HandoversManagementPage />,
              },
              {
                path: 'handovers/new',
                element: <HandoverCreatePage />,
              },
              {
                path: 'handovers/:id',
                element: <HandoverDetailPage />,
              },
              {
                path: 'handovers/:id/print',
                element: <HandoverPrintPage />,
              },
            ],
          },
        ],
      },
      {
        element: <RoleRoute allowedRoles={['STUDENT']} />,
        children: [
          {
            path: '/student',
            element: <DashboardLayout />,
            children: [
              {
                path: 'dashboard',
                element: <StudentDashboardPage />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'damage-reports',
                element: <StudentDamageReportsHistoryPage />,
              },
              {
                path: 'damage-reports/new',
                element: <StudentCreateDamageReportPage />,
              },
              {
                path: 'damage-reports/:id',
                element: <DamageReportDetailPage />,
              },
              {
                path: 'handovers',
                element: <StudentHandoversPage />,
              },
              {
                path: 'my-room',
                element: <StudentHandoversPage />,
              },
              {
                path: 'handovers/:id',
                element: <HandoverDetailPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
