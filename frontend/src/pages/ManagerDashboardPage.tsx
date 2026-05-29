import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/axios';
import { getApiErrorMessage } from '../lib/api-error';
import { formatDate, formatDateTime } from '../lib/format';
import { Asset, AssetsResponse } from '../types/assets';
import { DamageReport, DamageReportsResponse } from '../types/damage-reports';
import { InventoryCheck, InventoryChecksResponse } from '../types/inventory-checks';
import { DueAssetsResponse, MaintenancePlan, MaintenanceDashboardSummary } from '../types/maintenance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { DAMAGE_REPORT_STATUS } from '../constants/damage-reports';

export function ManagerDashboardPage() {
  const [summary, setSummary] = useState<MaintenanceDashboardSummary | null>(null);
  const [pendingReports, setPendingReports] = useState<DamageReport[]>([]);
  const [dueAssets, setDueAssets] = useState<MaintenancePlan[]>([]);
  const [damagedAssets, setDamagedAssets] = useState<Asset[]>([]);
  const [recentChecks, setRecentChecks] = useState<InventoryCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [summaryResponse, reportsResponse, dueAssetsResponse, damagedAssetsResponse, inventoryChecksResponse] =
        await Promise.all([
          apiClient.get<MaintenanceDashboardSummary>('/maintenance/dashboard-summary'),
          apiClient.get<DamageReportsResponse>('/damage-reports', {
            params: { status: DAMAGE_REPORT_STATUS.SUBMITTED, page: 1, pageSize: 5 },
          }),
          apiClient.get<DueAssetsResponse>('/maintenance/due-assets', {
            params: { days: 7 },
          }),
          apiClient.get<AssetsResponse>('/assets', {
            params: { status: 'DAMAGED', page: 1, pageSize: 5 },
          }),
          apiClient.get<InventoryChecksResponse>('/inventory-checks', {
            params: { page: 1, pageSize: 5 },
          }),
        ]);

      setSummary(summaryResponse.data);
      setPendingReports(reportsResponse.data.items);
      setDueAssets(dueAssetsResponse.data.items.slice(0, 5));
      setDamagedAssets(damagedAssetsResponse.data.items);
      setRecentChecks(inventoryChecksResponse.data.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Khong the tai dashboard.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive font-medium">
          {errorMessage}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Báo hỏng chờ xử lý</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần được xử lý khẩn cấp</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bảo trì sắp đến hạn</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary?.dueSoonCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Trong 7 ngày tới</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bảo trì quá hạn</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.overdueCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lập tức kiểm tra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tài sản đang hỏng</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{damagedAssets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần thay thế/sửa chữa</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Báo hỏng chờ xử lý</CardTitle>
            <CardDescription>Phiếu báo hỏng cần tiếp nhận ưu tiên</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <div className="space-y-4">
                {pendingReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{report.reportCode}</p>
                      <p className="text-sm text-muted-foreground">{report.asset?.assetName} - {report.room?.roomCode}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={report.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                        {report.priority}
                      </Badge>
                      <Link to={`/manager/damage-reports/${report.id}`}>
                        <Button variant="outline" size="sm">Xem</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kiểm kê gần đây</CardTitle>
            <CardDescription>Tiến độ kiểm kê tài sản</CardDescription>
          </CardHeader>
          <CardContent>
            {recentChecks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentChecks.map(check => (
                    <TableRow key={check.id}>
                      <TableCell className="font-medium">
                        <Link to={`/manager/inventory-checks/${check.id}`} className="hover:underline">
                          {check.inventoryCode}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(check.checkDate)}</TableCell>
                      <TableCell>
                        <Badge variant={check.status === 'COMPLETED' ? 'success' : 'warning'}>
                          {check.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
