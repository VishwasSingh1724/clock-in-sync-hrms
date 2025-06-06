
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, Calendar, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { canManageEmployees } from '@/lib/auth';

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  avgHoursPerDay: number;
  totalHoursThisMonth: number;
}

interface DepartmentAttendance {
  department: string;
  present: number;
  total: number;
  percentage: number;
}

const ReportsPage = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    avgHoursPerDay: 0,
    totalHoursThisMonth: 0
  });
  const [departmentData, setDepartmentData] = useState<DepartmentAttendance[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttendanceStats = async () => {
    setIsLoading(true);
    
    try {
      // Get total employees
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (empError) throw empError;

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance, error: todayError } = await supabase
        .from('attendance')
        .select('id, total_hours')
        .eq('date', today)
        .eq('status', 'PRESENT');

      if (todayError) throw todayError;

      // Get this month's data
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance')
        .select('total_hours')
        .gte('date', startOfMonth);

      if (monthlyError) throw monthlyError;

      const totalHoursThisMonth = monthlyAttendance?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;
      const avgHoursPerDay = todayAttendance?.reduce((sum, record) => sum + (record.total_hours || 0), 0) / (todayAttendance?.length || 1) || 0;

      setStats({
        totalEmployees: employees?.length || 0,
        presentToday: todayAttendance?.length || 0,
        avgHoursPerDay,
        totalHoursThisMonth
      });

      // Fetch department-wise attendance
      await fetchDepartmentAttendance();
      await fetchWeeklyAttendance();

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    
    setIsLoading(false);
  };

  const fetchDepartmentAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          departments (name),
          attendance!inner (
            id,
            date,
            status
          )
        `)
        .eq('attendance.date', today)
        .eq('is_active', true);

      if (error) throw error;

      const departmentStats: { [key: string]: { present: number; total: number } } = {};
      
      // Count total employees per department
      const { data: allEmployees } = await supabase
        .from('profiles')
        .select('departments (name)')
        .eq('is_active', true);

      allEmployees?.forEach((emp: any) => {
        const deptName = emp.departments?.name || 'No Department';
        if (!departmentStats[deptName]) {
          departmentStats[deptName] = { present: 0, total: 0 };
        }
        departmentStats[deptName].total++;
      });

      // Count present employees
      data?.forEach((emp: any) => {
        const deptName = emp.departments?.name || 'No Department';
        if (emp.attendance?.[0]?.status === 'PRESENT') {
          departmentStats[deptName].present++;
        }
      });

      const deptData = Object.entries(departmentStats).map(([department, stats]) => ({
        department,
        present: stats.present,
        total: stats.total,
        percentage: Math.round((stats.present / stats.total) * 100)
      }));

      setDepartmentData(deptData);
    } catch (error) {
      console.error('Error fetching department attendance:', error);
    }
  };

  const fetchWeeklyAttendance = async () => {
    try {
      const days = parseInt(selectedPeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status, total_hours')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) throw error;

      const dailyStats: { [key: string]: { present: number; totalHours: number } } = {};
      
      data?.forEach((record) => {
        if (!dailyStats[record.date]) {
          dailyStats[record.date] = { present: 0, totalHours: 0 };
        }
        if (record.status === 'PRESENT') {
          dailyStats[record.date].present++;
          dailyStats[record.date].totalHours += record.total_hours || 0;
        }
      });

      const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: stats.present,
        avgHours: Math.round((stats.totalHours / stats.present) * 10) / 10 || 0
      }));

      setWeeklyData(chartData);
    } catch (error) {
      console.error('Error fetching weekly attendance:', error);
    }
  };

  useEffect(() => {
    if (canManageEmployees(profile?.role)) {
      fetchAttendanceStats();
    }
  }, [profile, selectedPeriod]);

  if (!canManageEmployees(profile?.role)) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have permission to access reports.</p>
        </div>
      </DashboardLayout>
    );
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">Attendance insights and analytics</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.presentToday}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgHoursPerDay.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Today's average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Hours</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.totalHoursThisMonth)}h</div>
              <p className="text-xs text-muted-foreground">This month total</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Trend</CardTitle>
              <CardDescription>Attendance over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Attendance</CardTitle>
              <CardDescription>Today's attendance by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="present"
                    label={({ department, percentage }) => `${department}: ${percentage}%`}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Department Details */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Attendance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentData.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{dept.department}</div>
                    <div className="text-sm text-gray-600">
                      {dept.present} of {dept.total} employees present
                    </div>
                  </div>
                  <Badge variant={dept.percentage >= 80 ? 'default' : dept.percentage >= 60 ? 'secondary' : 'destructive'}>
                    {dept.percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
