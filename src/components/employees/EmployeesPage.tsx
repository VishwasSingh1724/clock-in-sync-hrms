
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { canManageEmployees } from '@/lib/auth';
import EmployeeForm from './EmployeeForm';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  employee_id: string;
  role: string;
  department_id: string | null;
  phone: string | null;
  hire_date: string | null;
  is_active: boolean;
  departments?: {
    name: string;
  };
}

const EmployeesPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        departments (
          name
        )
      `)
      .order('full_name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch employees',
        variant: 'destructive'
      });
    } else {
      setEmployees(data || []);
    }
    setIsLoading(false);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', employeeId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete employee',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Employee deleted successfully'
      });
      fetchEmployees();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  useEffect(() => {
    if (canManageEmployees(profile?.role)) {
      fetchEmployees();
    }
  }, [profile]);

  if (!canManageEmployees(profile?.role)) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      SUPERADMIN: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      HR: 'bg-blue-100 text-blue-800',
      HOD: 'bg-green-100 text-green-800',
      MANAGER: 'bg-yellow-100 text-yellow-800',
      DIRECTOR: 'bg-orange-100 text-orange-800',
      EMPLOYEE: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (showForm || editingEmployee) {
    return (
      <DashboardLayout>
        <EmployeeForm
          employee={editingEmployee}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-2">Manage your organization's employees</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employees ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employees found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {employee.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                        <div className="text-sm text-gray-500">
                          ID: {employee.employee_id} | {employee.departments?.name || 'No Department'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {employee.role}
                      </Badge>
                      <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEmployee(employee)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEmployee(employee.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeesPage;
