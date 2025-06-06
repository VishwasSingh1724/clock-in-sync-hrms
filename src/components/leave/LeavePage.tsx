
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { canManageEmployees } from '@/lib/auth';
import LeaveRequestForm from './LeaveRequestForm';

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    employee_id: string;
  };
}

const LeavePage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaveRequests = async () => {
    if (!profile) return;

    setIsLoading(true);

    // Fetch user's own requests
    const { data: myData, error: myError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        profiles (
          full_name,
          employee_id
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (myError) {
      console.error('Error fetching my requests:', myError);
    } else {
      setMyRequests(myData || []);
    }

    // If user can manage employees, fetch all requests
    if (canManageEmployees(profile.role)) {
      const { data: allData, error: allError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles (
            full_name,
            employee_id
          )
        `)
        .order('created_at', { ascending: false });

      if (allError) {
        console.error('Error fetching all requests:', allError);
      } else {
        setLeaveRequests(allData || []);
      }
    }

    setIsLoading(false);
  };

  const handleApproveReject = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!profile) return;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: profile.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update leave request',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Leave request ${status.toLowerCase()}`
      });
      fetchLeaveRequests();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchLeaveRequests();
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [profile]);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const typeColors = {
      SICK: 'bg-red-100 text-red-800',
      CASUAL: 'bg-blue-100 text-blue-800',
      ANNUAL: 'bg-green-100 text-green-800',
      MATERNITY: 'bg-pink-100 text-pink-800',
      PATERNITY: 'bg-purple-100 text-purple-800',
      EMERGENCY: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (showForm) {
    return (
      <DashboardLayout>
        <LeaveRequestForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-2">Manage leave requests and approvals</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Request Leave
          </Button>
        </div>

        {/* My Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              My Leave Requests
            </CardTitle>
            <CardDescription>Your submitted leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leave requests found
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">{request.reason}</div>
                        <div className="text-sm text-gray-500">
                          {calculateDays(request.start_date, request.end_date)} day(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getLeaveTypeBadge(request.leave_type)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Leave Requests (Admin View) */}
        {canManageEmployees(profile?.role) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                All Leave Requests
              </CardTitle>
              <CardDescription>Manage team leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No leave requests found
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {request.profiles.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{request.profiles.full_name}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">{request.reason}</div>
                          <div className="text-sm text-gray-500">
                            {calculateDays(request.start_date, request.end_date)} day(s) • ID: {request.profiles.employee_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getLeaveTypeBadge(request.leave_type)}
                        {getStatusBadge(request.status)}
                        {request.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveReject(request.id, 'APPROVED')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveReject(request.id, 'REJECTED')}
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeavePage;
