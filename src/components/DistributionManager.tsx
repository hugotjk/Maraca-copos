import React, { useState, useMemo } from 'react';
import { Product, Employee, DistributionResult } from '../types';
import { Share2, RefreshCw, AlertCircle } from 'lucide-react';

interface DistributionManagerProps {
  products: Product[];
  employees: Employee[];
  distribution: DistributionResult | null;
  setDistribution: (result: DistributionResult | null) => void;
  globalCashFloat: number;
  setGlobalCashFloat: (val: number) => void;
}

export function DistributionManager({ 
  products, 
  employees, 
  distribution, 
  setDistribution,
  globalCashFloat,
  setGlobalCashFloat
}: DistributionManagerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const handleDistribute = () => {
    if (employees.length === 0) return;

    const result: DistributionResult = {};
    
    employees.forEach(emp => {
      result[emp.id] = {
        employee: emp,
        items: [],
        cashFloat: globalCashFloat,
        cashReceived: 0,
        cardReceived: 0,
        sangria: 0
      };
    });

    products.forEach(product => {
      const perEmployee = Math.floor(product.quantity / employees.length);

      employees.forEach((emp) => {
        const qty = perEmployee;

        if (qty > 0) {
          result[emp.id].items.push({
            product,
            quantity: qty,
            returned: 0
          });
        }
      });
    });

    setDistribution(result);
  };

  const handleQuantityChange = (employeeId: string, productId: string, value: string) => {
    if (!distribution) return;
    const newQty = parseInt(value) || 0;
    const newDist = { ...distribution };
    const empData = newDist[employeeId];
    const item = empData.items.find(i => i.product.id === productId);
    if (item) {
      item.quantity = newQty;
    }
    setDistribution(newDist);
  };

  const totalDistributed = useMemo(() => {
    if (!distribution) return 0;
    return Object.values(distribution).reduce((acc, emp) => {
      return acc + emp.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }, [distribution]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Share2 className="w-6 h-6" />
          Distribuição
        </h2>
        <button
          onClick={handleDistribute}
          disabled={products.length === 0 || employees.length === 0}
          className="bg-flu-maroon hover:bg-opacity-90 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {distribution ? 'Reiniciar' : 'Distribuir'}
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1.5">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fundo de Caixa Geral (R$)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
          <input
            type="number"
            value={globalCashFloat || ''}
            onChange={(e) => setGlobalCashFloat(parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-black text-base focus:ring-2 focus:ring-flu-maroon outline-none transition-all"
          />
        </div>
        <p className="text-[9px] text-gray-400 font-medium italic leading-tight">* Este valor será aplicado a todos os funcionários no momento da distribuição.</p>
      </div>

      {(products.length === 0 || employees.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Ação Necessária</p>
            <p className="text-sm">
              Você precisa cadastrar pelo menos um produto e um funcionário antes de realizar a distribuição.
            </p>
          </div>
        </div>
      )}

      {distribution && (
        <div className="space-y-4">
          {employees.map((employee) => {
            const empData = distribution[employee.id];
            if (!empData) return null;
            const { items } = empData;
            const isSelected = selectedEmployeeId === employee.id;
            const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

            return (
              <div key={employee.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => setSelectedEmployeeId(isSelected ? null : employee.id)}
                  className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <h3 className="font-black text-base text-gray-800">{employee.name}</h3>
                    <p className="text-[10px] font-bold text-flu-maroon uppercase tracking-widest">{employee.sector}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total Itens</p>
                    <span className="text-base font-black text-flu-maroon">{totalItems}</span>
                  </div>
                </button>

                {isSelected && (
                  <div className="p-3 border-t border-gray-100 space-y-1.5 bg-gray-50/50">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 bg-white py-1.5 px-3 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-700 truncate">{item.product.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-400 uppercase">Qtd</span>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(employee.id, item.product.id, e.target.value)}
                            className="w-14 px-1 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-sm text-gray-400 italic text-center py-2">Nenhum item atribuído.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {distribution && (
        <div className="bg-flu-maroon/5 p-4 rounded-lg text-center">
          <p className="text-flu-maroon font-medium">
            Total distribuído: <span className="font-bold">{totalDistributed}</span> itens entre {employees.length} funcionários.
          </p>
        </div>
      )}
    </div>
  );
}
