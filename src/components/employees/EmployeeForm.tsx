
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/auth';

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
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm = ({ employee, onSuccess, onCancel }: EmployeeFormProps) => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'EMPLOYEE' as UserRole,
    department_id: '',
    phone: '',
    hire_date: '',
    is_active: true
  });

  const roles: UserRole[] = ['SUPERADMIN', 'ADMIN', 'HR', 'HOD', 'MANAGER', 'DIRECTOR', 'EMPLOYEE'];

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
  };

  useEffect(() => {
    fetchDepartments();
    
    if (employee) {
      setFormData({
        email: employee.email,
        full_name: employee.full_name,
        role: employee.role as UserRole,
        department_id: employee.department_id || '',
        phone: employee.phone || '',
        hire_date: employee.hire_date || '',
        is_active: employee.is_active
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        department_id: formData.department_id || null,
        phone: formData.phone || null,
        hire_date: formData.hire_date || null,
        is_active: formData.is_active
      };

      if (employee) {
        // Update existing employee
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', employee.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Employee updated successfully'
        });
      } else {
        // For new employees, we would need to handle user creation differently
        // This would typically involve inviting them via email
        toast({
          title: 'Info',
          description: 'New employee creation requires additional setup'
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save employee',
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </h1>
        <p className="text-gray-600 mt-2">
          {employee ? 'Update employee information' : 'Create a new employee profile'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active Employee</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeForm;
