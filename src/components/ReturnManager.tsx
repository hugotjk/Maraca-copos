import React, { useState } from 'react';
import { DistributionResult, Employee, Product, DistributionItem } from '../types';
import { RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

interface ReturnManagerProps {
  employees: Employee[];
  distribution: DistributionResult | null;
  setDistribution: (dist: DistributionResult | null) => void;
  globalCashFloat: number;
}

export function ReturnManager({ employees, distribution, setDistribution, globalCashFloat }: ReturnManagerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  if (!distribution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <RotateCcw className="w-16 h-16 opacity-20" />
        <p className="text-lg italic text-center px-4">Realize uma distribuição primeiro para poder processar as devoluções.</p>
      </div>
    );
  }

  const handleReturnChange = (employeeId: string, description: string, value: string) => {
    const totalReturned = parseInt(value) || 0;
    const newDist = { ...distribution };
    const empData = newDist[employeeId];
    
    const itemsToUpdate = empData.items.filter(i => i.product.description === description);
    const maxPossibleReturns = itemsToUpdate.reduce((sum, i) => sum + i.quantity, 0);
    let remainingToReturn = Math.min(maxPossibleReturns, Math.max(0, totalReturned));
    
    itemsToUpdate.forEach(item => {
      const canReturn = Math.min(item.quantity, remainingToReturn);
      item.returned = canReturn;
      remainingToReturn -= canReturn;
    });
    
    setDistribution(newDist);
  };

  const handleFinanceChange = (employeeId: string, field: 'cashReceived' | 'cardReceived' | 'sangria', value: string) => {
    const num = parseFloat(value) || 0;
    const newDist = { ...distribution };
    newDist[employeeId][field] = num;
    setDistribution(newDist);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <RotateCcw className="w-6 h-6" />
          Devolução
        </h2>
      </div>

      <div className="space-y-4">
        {employees.map((employee) => {
          const empData = distribution[employee.id];
          if (!empData) return null;
          const { items, cashReceived, cardReceived, sangria } = empData;
          const isSelected = selectedEmployeeId === employee.id;
          
          // Group by description for the visual report
          const grouped = items.reduce((acc, item) => {
            const desc = item.product.description;
            if (!acc[desc]) {
              acc[desc] = { qty: 0, returned: 0, commission: item.product.commission };
            }
            acc[desc].qty += item.quantity;
            acc[desc].returned += item.returned;
            return acc;
          }, {} as Record<string, { qty: number; returned: number; commission: number }>);

          const totalSoldValue = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.pdv), 0);
          const totalCommission = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.commission), 0);
          const totalReceived = cashReceived + cardReceived + sangria;
          const expectedCash = totalSoldValue + globalCashFloat;
          const divergence = totalReceived - expectedCash;
          
          // If divergence is negative (shortage), deduct from commission
          const finalCommission = Math.max(0, totalCommission + (divergence < 0 ? divergence : 0));
          const totalSoldItems = items.reduce((sum, i) => sum + (i.quantity - i.returned), 0);
          const totalReturnedValue = items.reduce((sum, i) => sum + (i.returned * i.product.pdv), 0);

          return (
            <div key={employee.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <button 
                onClick={() => setSelectedEmployeeId(isSelected ? null : employee.id)}
                className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-black text-base text-gray-800">{employee.name}</h3>
                  <p className="text-[10px] font-bold text-flu-maroon uppercase tracking-widest">{employee.sector}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Status</p>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full",
                    totalReturnedValue > 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {totalReturnedValue > 0 ? 'Processado' : 'Pendente'}
                  </span>
                </div>
              </button>

              {isSelected && (
                <div className="p-3 border-t border-gray-100 space-y-4 bg-gray-50/50">
                  {/* Return Inputs */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens Devolvidos (por Descrição)</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.entries(grouped).map(([desc, info]) => (
                        <div key={desc} className="bg-white py-1.5 px-3 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 truncate">{desc}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Total Saiu: {info.qty}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Voltou</span>
                            <input
                              type="number"
                              value={info.returned}
                              onChange={(e) => handleReturnChange(employee.id, desc, e.target.value)}
                              className="w-14 px-1 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Finance Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Dinheiro (R$)</label>
                      <input
                        type="number"
                        value={cashReceived || ''}
                        onChange={(e) => handleFinanceChange(employee.id, 'cashReceived', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Cartão (R$)</label>
                      <input
                        type="number"
                        value={cardReceived || ''}
                        onChange={(e) => handleFinanceChange(employee.id, 'cardReceived', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Sangria (R$)</label>
                      <input
                        type="number"
                        value={sangria || ''}
                        onChange={(e) => handleFinanceChange(employee.id, 'sangria', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className={cn(
                        "p-1.5 rounded-lg text-center",
                        divergence >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        <p className="text-[8px] font-black uppercase">Divergência</p>
                        <p className="text-xs font-black">{formatCurrency(divergence)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
