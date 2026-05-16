import React, { useState } from 'react';
import { Employee } from '../types';
import { Plus, Trash2, Edit2, Users, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';

interface EmployeeManagerProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

export function EmployeeManager({ employees, setEmployees }: EmployeeManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'sector'>>({
    name: '',
  });

  const updateSectors = (list: Employee[]) => {
    return list.map((emp, index) => {
      const isLast = index === list.length - 1 && list.length > 0;
      return {
        ...emp,
        sector: isLast ? 'Promoção' : `Leste ${(index + 1).toString().padStart(2, '0')}`
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updated = employees.map(emp => emp.id === editingId ? { ...emp, name: formData.name } : emp);
      setEmployees(updateSectors(updated));
      setEditingId(null);
    } else {
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        name: formData.name,
        sector: '', // Will be updated by updateSectors
      };
      setEmployees(updateSectors([...employees, newEmployee]));
    }
    setFormData({ name: '' });
    setIsAdding(false);
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
    });
    setEditingId(employee.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
      setEmployees(updateSectors(employees.filter(emp => emp.id !== id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Funcionários e Setores
        </h2>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ name: '' });
          }}
          className="bg-flu-maroon hover:bg-opacity-90 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-[10px] font-black min-w-[100px]"
        >
          <Plus className="w-3 h-3" />
          {isAdding ? 'Cancelar' : 'Novo'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-flu-maroon outline-none"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-flu-green hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-bold transition-colors w-full"
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {employees.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-500 italic rounded-xl border border-dashed border-gray-300">
            Nenhum funcionário cadastrado.
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={employees} 
            onReorder={(newOrder) => setEmployees(updateSectors(newOrder))}
            className="flex flex-col gap-3"
          >
            {employees.map(employee => (
              <EmployeeCard 
                key={employee.id} 
                employee={employee} 
                handleEdit={handleEdit} 
                handleDelete={handleDelete} 
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

function EmployeeCard({ employee, handleEdit, handleDelete }: { 
  employee: Employee, 
  handleEdit: (e: Employee) => void, 
  handleDelete: (id: string) => void,
  key?: React.Key
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={employee}
      dragListener={false}
      dragControls={dragControls}
      className="bg-white py-2 px-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-gray-800">{employee.name}</h3>
          <p className="text-[10px] text-flu-maroon uppercase tracking-wider font-semibold">{employee.sector}</p>
        </div>
      </div>
      <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}
