import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { apiClient } from '../lib/axios';
import { ReportsSummary, MonthlyCount, AssetsByCategory, StatusBreakdown } from '../types/reports';
import { getApiErrorMessage } from '../lib/api-error';
import { useToast } from '../toast/toast-context';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  'IN_USE': '#10b981',      // emerald-500
  'IN_STORAGE': '#64748b',   // slate-500
  'DAMAGED': '#f43f5e',      // rose-500
  'LIQUIDATED': '#f59e0b'    // amber-500
};

const STATUS_LABELS: Record<string, string> = {
  'IN_USE': 'Đang sử dụng',
  'IN_STORAGE': 'Trong kho',
  'DAMAGED': 'Báo hỏng',
  'LIQUIDATED': 'Đã thanh lý'
};

export function AdminDashboardPage() {
  const { showToast } = useToast();
  
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [damageByMonth, setDamageByMonth] = useState<MonthlyCount[]>([]);
  const [assetsByCategory, setAssetsByCategory] = useState<AssetsByCategory[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (dateRange.fromDate) Object.assign(params, { fromDate: dateRange.fromDate });
      if (dateRange.toDate) Object.assign(params, { toDate: dateRange.toDate });

      const [summaryRes, damageRes, categoryRes] = await Promise.all([
        apiClient.get<ReportsSummary>('/reports/summary', { params }),
        apiClient.get<MonthlyCount[]>('/reports/damage-reports-by-month', { params }),
        apiClient.get<AssetsByCategory[]>('/reports/assets-by-category', { params })
      ]);
      setSummary(summaryRes.data);
      setDamageByMonth(damageRes.data);
      // Giới hạn hiển thị 6 danh mục có nhiều tài sản nhất
      setAssetsByCategory(categoryRes.data.slice(0, 6));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải dữ liệu Dashboard.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    void loadDashboard();
  };

  const clearFilter = () => {
    setDateRange({ fromDate: '', toDate: '' });
    // Tự động load lại sau khi clear state, cần timeout nhỏ để state kịp cập nhật
    setTimeout(() => {
      void loadDashboard();
    }, 0);
  };

  if (isLoading && !summary) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-slate-400 animate-pulse font-medium text-lg flex items-center gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Đang tổng hợp dữ liệu hệ thống...
        </div>
      </div>
    );
  }

  // Chuẩn bị data cho biểu đồ tròn (Pie Chart)
  const pieData = summary?.assetsByStatus.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#94a3b8'
  })) || [];

  return (
    <div className="space-y-6 max-w-full mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tổng quan Hệ thống</h2>
          <p className="text-sm text-slate-500 mt-1">Cái nhìn toàn cảnh về tài sản và cơ sở vật chất.</p>
        </div>
        
        <form onSubmit={handleFilter} className="flex items-center gap-2 text-sm w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <input 
              type="date" 
              value={dateRange.fromDate}
              onChange={e => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
              className="bg-transparent border-none outline-none text-slate-600 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 transition" 
              title="Từ ngày"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={dateRange.toDate}
              onChange={e => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
              className="bg-transparent border-none outline-none text-slate-600 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 transition" 
              title="Đến ngày"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition shadow-sm">
            Lọc
          </button>
          {(dateRange.fromDate || dateRange.toDate) && (
            <button type="button" onClick={clearFilter} className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Xóa bộ lọc">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </form>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1 */}
        <Card className="border-emerald-100 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-800">Tổng Tài Sản</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{summary?.totalAssets.toLocaleString() ?? 0}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Trong toàn hệ thống
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="border-sky-100 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-sky-800">Không Gian & Cư Dân</CardTitle>
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{summary?.totalRooms.toLocaleString() ?? 0}</span>
              <span className="text-sm text-slate-500 font-medium">phòng</span>
            </div>
            <p className="text-xs text-sky-600 font-medium mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              {summary?.totalStudents.toLocaleString() ?? 0} sinh viên nội trú
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="border-rose-100 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-rose-800">Báo Hỏng Chờ Xử Lý</CardTitle>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{summary?.pendingDamageReports.toLocaleString() ?? 0}</div>
            <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              Cần phân công kỹ thuật viên
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="border-amber-100 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">Đến Hạn Bảo Trì</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{summary?.maintenanceDueCount.toLocaleString() ?? 0}</div>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              Kế hoạch bảo trì sắp đến hạn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS GRID */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* PIE CHART - Tỷ lệ Trạng thái Tài sản */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Phân bổ Tài sản</CardTitle>
            <CardDescription>Theo trạng thái hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
              {pieData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Không có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value} tài sản`, 'Số lượng']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {pieData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-600 font-medium truncate" title={entry.name}>{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* LINE CHART - Tần suất Báo hỏng */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Tần suất Báo Hỏng</CardTitle>
            <CardDescription>Số lượng phiếu báo hỏng được gửi lên theo từng tháng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full relative mt-4">
              {damageByMonth.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Không có dữ liệu báo hỏng</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={damageByMonth} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                      tickFormatter={(val: string) => {
                        const parts = val.split('-');
                        if(parts.length === 2) return `T${parts[1]}/${parts[0].slice(2)}`;
                        return val;
                      }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <RechartsTooltip 
                      cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(label) => `Tháng: ${label}`}
                      formatter={(value: number) => [value, 'Số phiếu']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#f43f5e" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* BAR CHART - Danh mục Tài sản */}
        <Card className="lg:col-span-3 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Top Danh Mục Tài Sản</CardTitle>
            <CardDescription>Những loại tài sản chiếm số lượng lớn nhất trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
              {assetsByCategory.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Không có dữ liệu danh mục</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetsByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis 
                      dataKey="categoryName" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                      width={120}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} tài sản`, 'Số lượng']}
                    />
                    <Bar 
                      dataKey="totalAssets" 
                      fill="#0ea5e9" 
                      radius={[0, 4, 4, 0]} 
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
