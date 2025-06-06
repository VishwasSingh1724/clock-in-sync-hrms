
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { isAdmin } from '@/lib/auth';
import DepartmentForm from './DepartmentForm';

interface Department {
  id: string;
  name: string;
  description: string | null;
  hod_id: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    employee_id: string;
  } | null;
  employee_count?: number;
}

const DepartmentsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        profiles (
          full_name,
          employee_id
        )
      `)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive'
      });
    } else {
      // Get employee count for each department
      const departmentsWithCount = await Promise.all(
        (data || []).map(async (dept) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('department_id', dept.id)
            .eq('is_active', true);
          
          return {
            ...dept,
            employee_count: count || 0
          };
        })
      );
      
      setDepartments(departmentsWithCount);
    }
    setIsLoading(false);
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Department deleted successfully'
      });
      fetchDepartments();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDepartment(null);
    fetchDepartments();
  };

  useEffect(() => {
    if (isAdmin(profile?.role)) {
      fetchDepartments();
    }
  }, [profile]);

  if (!isAdmin(profile?.role)) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (showForm || editingDepartment) {
    return (
      <DashboardLayout>
        <DepartmentForm
          department={editingDepartment}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingDepartment(null);
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
            <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600 mt-2">Organize and manage departments</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Department
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">Loading departments...</div>
          ) : filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No departments found
            </div>
          ) : (
            filteredDepartments.map((department) => (
              <Card key={department.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{department.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {department.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDepartment(department)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDepartment(department.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Employees</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {department.employee_count}
                      </Badge>
                    </div>
                    
                    {department.profiles && (
                      <div>
                        <span className="text-sm text-gray-600">Head of Department</span>
                        <div className="text-sm font-medium">
                          {department.profiles.full_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {department.profiles.employee_id}
                        </div>
                      </div>
                    )}
                    
                    {!department.profiles && (
                      <div className="text-sm text-gray-500 italic">
                        No HOD assigned
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DepartmentsPage;
