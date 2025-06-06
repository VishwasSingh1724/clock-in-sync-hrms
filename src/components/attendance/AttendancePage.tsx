
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AttendanceRecord {
  id: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  status: string;
  location_in: string | null;
  location_out: string | null;
}

const AttendancePage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentLocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(`${position.coords.latitude}, ${position.coords.longitude}`);
          },
          () => resolve('Location not available')
        );
      } else {
        resolve('Geolocation not supported');
      }
    });
  };

  const fetchTodayAttendance = async () => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching today attendance:', error);
      return;
    }

    setTodayAttendance(data);
  };

  const fetchRecentAttendance = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(7);

    if (error) {
      console.error('Error fetching recent attendance:', error);
      return;
    }

    setRecentAttendance(data || []);
  };

  const handlePunchIn = async () => {
    if (!profile) return;

    setIsLoading(true);
    const location = await getCurrentLocation();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id: profile.id,
        date: today,
        punch_in: new Date().toISOString(),
        location_in: location,
        status: 'PRESENT'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to punch in. Please try again.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Punched In!',
        description: 'Your attendance has been recorded.'
      });
      fetchTodayAttendance();
      fetchRecentAttendance();
    }

    setIsLoading(false);
  };

  const handlePunchOut = async () => {
    if (!profile || !todayAttendance) return;

    setIsLoading(true);
    const location = await getCurrentLocation();

    const { error } = await supabase
      .from('attendance')
      .update({
        punch_out: new Date().toISOString(),
        location_out: location
      })
      .eq('id', todayAttendance.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to punch out. Please try again.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Punched Out!',
        description: 'Your day has been completed.'
      });
      fetchTodayAttendance();
      fetchRecentAttendance();
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchTodayAttendance();
    fetchRecentAttendance();
  }, [profile]);

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      HALF_DAY: 'bg-yellow-100 text-yellow-800',
      LATE: 'bg-orange-100 text-orange-800',
      EARLY_LEAVE: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-2">Track your daily attendance</p>
        </div>

        {/* Today's Attendance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(todayAttendance?.punch_in)}
                </div>
                <div className="text-sm text-gray-600">Punch In</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {formatTime(todayAttendance?.punch_out)}
                </div>
                <div className="text-sm text-gray-600">Punch Out</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {todayAttendance?.total_hours?.toFixed(1) || '0.0'}h
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              {!todayAttendance ? (
                <Button onClick={handlePunchIn} disabled={isLoading} className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Punch In
                </Button>
              ) : !todayAttendance.punch_out ? (
                <Button onClick={handlePunchOut} disabled={isLoading} variant="destructive" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Punch Out
                </Button>
              ) : (
                <div className="text-center">
                  <Badge className="bg-green-100 text-green-800">Day Completed</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>In: {formatTime(record.punch_in)}</span>
                    <span>Out: {formatTime(record.punch_out)}</span>
                    <span className="font-medium">
                      {record.total_hours?.toFixed(1) || '0.0'}h
                    </span>
                  </div>
                </div>
              ))}
              
              {recentAttendance.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;
