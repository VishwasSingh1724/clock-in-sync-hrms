
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  description: string | null;
  hod_id: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
}

interface DepartmentFormProps {
  department?: Department | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DepartmentForm = ({ department, onSuccess, onCancel }: DepartmentFormProps) => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hod_id: ''
  });

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id')
      .eq('is_active', true)
      .order('full_name');

    if (!error && data) {
      setEmployees(data);
    }
  };

  useEffect(() => {
    fetchEmployees();
    
    if (department) {
      setFormData({
        name: department.name,
        description: department.description || '',
        hod_id: department.hod_id || ''
      });
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        name: formData.name,
        description: formData.description || null,
        hod_id: formData.hod_id || null
      };

      if (department) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update(submitData)
          .eq('id', department.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Department updated successfully'
        });
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert(submitData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Department created successfully'
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save department',
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {department ? 'Edit Department' : 'Add New Department'}
        </h1>
        <p className="text-gray-600 mt-2">
          {department ? 'Update department information' : 'Create a new department'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hod">Head of Department</Label>
              <Select value={formData.hod_id} onValueChange={(value) => setFormData({ ...formData, hod_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No HOD</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
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

export default DepartmentForm;
