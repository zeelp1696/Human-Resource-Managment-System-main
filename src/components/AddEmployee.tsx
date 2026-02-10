import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, X, AlertCircle } from 'lucide-react';
import { Employee } from '../types';
import { apiService } from '../utils/api';

interface AddEmployeeProps {
  onEmployeeAdded: () => void;
}

interface SkillInput {
  name: string;
  level: number;
  category: string;
}

export function AddEmployee({ onEmployeeAdded }: AddEmployeeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    phone: '',
    experience: 0,
    salary: 0,
  });

  const [skills, setSkills] = useState<SkillInput[]>([]);
  const [newSkill, setNewSkill] = useState<SkillInput>({
    name: '',
    level: 1,
    category: 'Technical',
  });

  const departments = [
    'Engineering',
    'Human Resources',
    'Marketing',
    'Sales',
    'Finance',
    'Operations',
    'Design',
    'Product',
    'Customer Support',
    'Legal',
  ];

  const skillCategories = [
    'Technical',
    'Programming',
    'Design',
    'Management',
    'Communication',
    'Marketing',
    'Sales',
    'Finance',
    'Operations',
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.name.trim()) {
      setSkills((prev) => [...prev, { ...newSkill }]);
      setNewSkill({ name: '', level: 1, category: 'Technical' });
    }
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const newEmployee: Omit<Employee, 'id'> = {
        ...formData,
        joinDate: new Date().toISOString().slice(0, 10),
        skills: skills,
        availability: 100,
        currentTasks: 0,
      };

      await apiService.addEmployee(newEmployee);

      // reset form
      setFormData({
        name: '',
        email: '',
        position: '',
        department: '',
        phone: '',
        experience: 0,
        salary: 0,
      });
      setSkills([]);
      setIsOpen(false);
      onEmployeeAdded();
    } catch (err: any) {
      console.error('Failed to add employee:', err);
      setError(err.message || 'Failed to add employee. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-100 text-green-800';
    if (level === 3) return 'bg-blue-100 text-blue-800';
    if (level === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill out the details below to add a new employee to the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val: string) => handleInputChange('department', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="font-medium">Skills</h3>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input
                  placeholder="Skill name"
                  value={newSkill.name}
                  onChange={(e) =>
                    setNewSkill((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-3">
                <Select
                  value={newSkill.category}
                  onValueChange={(val: string) =>
                    setNewSkill((prev) => ({ ...prev, category: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {skillCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Select
                  value={newSkill.level.toString()}
                  onValueChange={(val: string) =>
                    setNewSkill((prev) => ({ ...prev, level: parseInt(val) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <SelectItem key={lvl} value={lvl.toString()}>
                        Level {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Button
                  type="button"
                  onClick={addSkill}
                  disabled={!newSkill.name.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className={`${getSkillLevelColor(
                      skill.level
                    )} flex items-center gap-1`}
                  >
                    {skill.name} L{skill.level} ({skill.category})
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSkill(i)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.name ||
                !formData.email ||
                !formData.position ||
                !formData.department
              }
            >
              {isLoading ? 'Adding...' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
