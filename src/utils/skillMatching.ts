import { Employee, Task, SkillMatch } from '../types';

/**
 * Calculate skill match between an employee and a task
 */
export function calculateSkillMatch(employee: Employee, task: Task): SkillMatch {
  const employeeSkills = employee.skills || [];
  const requiredSkills = task.requiredSkills || [];

  let totalScore = 0;
  let maxScore = 0;
  const matchedSkills = [];
  const missingSkills = [];

  for (const required of requiredSkills) {
    const employeeSkill = employeeSkills.find(skill => skill.name === required.name);

    // Weight based on importance
    const importanceWeight = required.importance === 'required' ? 3 :
                             required.importance === 'preferred' ? 2 : 1;

    maxScore += importanceWeight * 5; // max level is 5

    if (employeeSkill) {
      const skillScore = Math.min(employeeSkill.level / required.level, 1) * 5;
      totalScore += skillScore * importanceWeight;
      matchedSkills.push(employeeSkill);

      if (employeeSkill.level < required.level) {
        missingSkills.push(required);
      }
    } else {
      missingSkills.push(required);
    }
  }

  const matchScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const availabilityScore = employee.availability || 0;

  return {
    employee,
    matchScore: Math.round(matchScore),
    matchedSkills,
    missingSkills,
    availabilityScore,
  };
}

/**
 * Find top 5 employees for a given task
 */
export function findBestEmployeesForTask(employees: Employee[], task: Task): SkillMatch[] {
  if (!employees || employees.length === 0 || !task) return [];

  const matches = employees.map(employee => calculateSkillMatch(employee, task));

  return matches
    .map(match => ({
      ...match,
      combinedScore: match.matchScore * 0.7 + match.availabilityScore * 0.3,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 5);
}

/**
 * Calculate skill gaps across all employees and tasks
 */
export function getSkillGaps(employees: Employee[], tasks: Task[]): { skill: string; demand: number; supply: number; gap: number }[] {
  if (!employees?.length || !tasks?.length) return [];

  const skillDemand: Record<string, number> = {};
  const skillSupply: Record<string, number> = {};

  // Demand from tasks
  tasks.forEach(task => {
    (task.requiredSkills || []).forEach(skill => {
      skillDemand[skill.name] = (skillDemand[skill.name] || 0) + 1;
    });
  });

  // Supply from employees
  employees.forEach(employee => {
    (employee.skills || []).forEach(skill => {
      if (skill.level >= 3) { // Only proficient+
        skillSupply[skill.name] = (skillSupply[skill.name] || 0) + 1;
      }
    });
  });

  // Merge all skills
  const allSkills = new Set([...Object.keys(skillDemand), ...Object.keys(skillSupply)]);

  return Array.from(allSkills)
    .map(skill => ({
      skill,
      demand: skillDemand[skill] || 0,
      supply: skillSupply[skill] || 0,
      gap: (skillDemand[skill] || 0) - (skillSupply[skill] || 0),
    }))
    .sort((a, b) => b.gap - a.gap);
}
