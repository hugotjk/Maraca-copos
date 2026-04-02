import React, { useState, useMemo } from 'react';
import { DistributionResult, Employee, Transaction } from '../types';
import { RotateCcw, DollarSign, CreditCard, MinusCircle, Save } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface ReturnManagerProps {
  employees: Employee[];
  distribution: DistributionResult | null;
  setDistribution: (dist: DistributionResult | null) => void;
  globalCashFloat: number;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
}

export function ReturnManager({ employees, distribution, setDistribution, globalCashFloat, addTransaction }: ReturnManagerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const handleReturnChangeByDescription = (employeeId: string, description: string, value: string) => {
    if (!distribution) return;
    let newReturned = parseInt(value) || 0;
    const newDist = { ...distribution };
    const empData = newDist[employeeId];
    
    // Find all items with this description
    const itemsToUpdate = empData.items.filter(i => (i.product.description || i.product.name) === description);
    const totalQty = itemsToUpdate.reduce((sum, i) => sum + i.quantity, 0);
    
    newReturned = Math.max(0, Math.min(totalQty, newReturned));
    
    // Distribute the returned amount across items
    let remainingToReturn = newReturned;
    itemsToUpdate.forEach(item => {
      const canReturn = Math.min(item.quantity, remainingToReturn);
      item.returned = canReturn;
      remainingToReturn -= canReturn;
    });
    
    setDistribution(newDist);
  };

  const handleFinanceChange = (employeeId: string, field: 'cashReceived' | 'cardReceived' | 'sangria', value: string) => {
    if (!distribution) return;
    const num = parseFloat(value) || 0;
    const newDist = { ...distribution };
    newDist[employeeId][field] = num;
    setDistribution(newDist);
  };

  const calculateDivergence = (employeeId: string) => {
    if (!distribution) return 0;
    const empData = distribution[employeeId];
    const expectedSales = empData.items.reduce((acc, item) => {
      const sold = item.quantity - item.returned;
      return acc + (sold * item.product.price);
    }, 0);
    
    const actualReceived = empData.cashReceived + empData.cardReceived + empData.sangria - empData.cashFloat;
    return actualReceived - expectedSales;
  };

  const handleSaveTransaction = (employeeId: string) => {
    if (!distribution) return;
    const empData = distribution[employeeId];
    const expectedSales = empData.items.reduce((acc, item) => {
      const sold = item.quantity - item.returned;
      return acc + (sold * item.product.price);
    }, 0);
    const totalReturnedQty = empData.items.reduce((acc, item) => acc + item.returned, 0);
    const totalReturnedValue = empData.items.reduce((acc, item) => acc + (item.returned * item.product.price), 0);

    const itemsList = empData.items.map(i => ({
      name: i.product.name,
      distributed: i.quantity,
      returned: i.returned,
      sold: i.quantity - i.returned,
      price: i.product.price
    }));

    if (expectedSales > 0) {
      addTransaction({
        type: 'venda',
        description: `Venda - ${empData.employee.name}`,
        amount: expectedSales,
        employeeName: empData.employee.name,
        details: `Venda total de ${empData.items.reduce((acc, i) => acc + (i.quantity - i.returned), 0)} itens.`,
        items: itemsList
      });
    }

    if (totalReturnedQty > 0) {
      addTransaction({
        type: 'devolucao',
        description: `Devolução - ${empData.employee.name}`,
        amount: totalReturnedValue,
        employeeName: empData.employee.name,
        details: `${totalReturnedQty} itens devolvidos.`,
        items: itemsList.filter(i => i.returned > 0)
      });
    }

    if (empData.sangria > 0) {
      addTransaction({
        type: 'sangria',
        description: `Sangria - ${empData.employee.name}`,
        amount: empData.sangria,
        employeeName: empData.employee.name
      });
    }

    alert('Transações registradas no histórico com sucesso!');
  };

  const financialTotals = useMemo(() => {
    if (!distribution) return { cash: 0, card: 0, sangria: 0, divergence: 0, totalSales: 0, itemSummary: [] as { description: string, sold: number, total: number }[] };
    
    const summary: Record<string, { description: string, sold: number, total: number }> = {};
    
    const totals = Object.keys(distribution).reduce((acc, empId) => {
      const empData = distribution[empId];
      // Subtract float from cash to get actual sales cash
      acc.cash += (empData.cashReceived - empData.cashFloat);
      acc.card += empData.cardReceived;
      acc.sangria += empData.sangria;
      acc.divergence += calculateDivergence(empId);
      
      empData.items.forEach(item => {
        const sold = item.quantity - item.returned;
        const value = sold * item.product.price;
        acc.totalSales += value;
        
        const desc = item.product.description || item.product.name;
        if (!summary[desc]) {
          summary[desc] = { description: desc, sold: 0, total: 0 };
        }
        summary[desc].sold += sold;
        summary[desc].total += value;
      });
      
      return acc;
    }, { cash: 0, card: 0, sangria: 0, divergence: 0, totalSales: 0 });

    return {
      ...totals,
      itemSummary: Object.values(summary).sort((a, b) => b.total - a.total)
    };
  }, [distribution]);

  if (!distribution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <RotateCcw className="w-16 h-16 opacity-20" />
        <p className="text-lg italic text-center px-4">Realize uma distribuição primeiro para poder processar as devoluções.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <RotateCcw className="w-6 h-6" />
        Devolução e Acerto
      </h2>

      <div className="space-y-1.5">
        {/* TOTAL Row */}
        <div className="bg-flu-maroon rounded-2xl shadow-md border border-flu-maroon/20 overflow-hidden">
          <button 
            onClick={() => setSelectedEmployeeId(selectedEmployeeId === 'total' ? null : 'total')}
            className="w-full p-3 flex justify-between items-center hover:bg-flu-maroon/90 transition-colors text-left"
          >
            <div>
              <h3 className="font-black text-base text-white">TOTAL GERAL</h3>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Resumo de Vendas</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-white/60 uppercase">Total Vendido</p>
              <span className="text-base font-black text-white">
                {formatCurrency(financialTotals.totalSales)}
              </span>
            </div>
          </button>

          {selectedEmployeeId === 'total' && (
            <div className="p-3 border-t border-white/10 space-y-3 bg-white/5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                  <p className="text-[8px] font-black text-white/40 uppercase">Venda em Dinheiro</p>
                  <p className="text-sm font-black text-white">{formatCurrency(financialTotals.cash)}</p>
                </div>
                <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                  <p className="text-[8px] font-black text-white/40 uppercase">Cartão Recebido</p>
                  <p className="text-sm font-black text-white">{formatCurrency(financialTotals.card)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Vendas por Item</h4>
                <div className="flex flex-col gap-1">
                  {financialTotals.itemSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 bg-white/5 py-1.5 px-3 rounded-xl border border-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.description}</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase">Vendidos: {item.sold}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-black text-white/40 uppercase">Divergência Total</p>
                  <p className={cn(
                    "text-sm font-black",
                    financialTotals.divergence < 0 ? "text-red-400" : financialTotals.divergence > 0 ? "text-green-400" : "text-white"
                  )}>
                    {formatCurrency(financialTotals.divergence)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-white/40 uppercase">Sangria Total</p>
                  <p className="text-sm font-black text-white">{formatCurrency(financialTotals.sangria)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {employees.map((employee) => {
          const empData = distribution[employee.id];
          if (!empData) return null;
          const isSelected = selectedEmployeeId === employee.id;
          const divergence = calculateDivergence(employee.id);
          const totalSold = empData.items.reduce((acc, item) => acc + (item.quantity - item.returned), 0);

          const groupedItems = (() => {
            const groups: Record<string, { description: string, quantity: number, returned: number }> = {};
            empData.items.forEach(item => {
              const desc = item.product.description || item.product.name;
              if (!groups[desc]) {
                groups[desc] = { description: desc, quantity: 0, returned: 0 };
              }
              groups[desc].quantity += item.quantity;
              groups[desc].returned += item.returned;
            });
            return Object.values(groups);
          })();

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
                  <p className="text-[9px] font-black text-gray-400 uppercase">Divergência</p>
                  <span className={cn(
                    "text-base font-black",
                    divergence < 0 ? "text-red-500" : divergence > 0 ? "text-green-500" : "text-gray-800"
                  )}>
                    {formatCurrency(divergence)}
                  </span>
                </div>
              </button>

              {isSelected && (
                <div className="p-3 border-t border-gray-100 space-y-4 bg-gray-50/50">
                  {/* Returns Section */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Devolução de Peças</h4>
                    {groupedItems.map((group, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 bg-white py-1.5 px-3 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-700 truncate">{group.description}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Saiu: {group.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-400 uppercase">Dev</span>
                          <input
                            type="number"
                            value={group.returned}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleReturnChangeByDescription(employee.id, group.description, e.target.value)}
                            className="w-14 px-1 py-0.5 text-center font-bold bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Section */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Acerto Financeiro</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="bg-white py-1.5 px-3 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <p className="text-[9px] font-black text-gray-400 uppercase">Dinheiro</p>
                        </div>
                        <input
                          type="number"
                          value={empData.cashReceived || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleFinanceChange(employee.id, 'cashReceived', e.target.value)}
                          placeholder="0,00"
                          className="w-24 text-right font-black text-sm bg-transparent outline-none"
                        />
                      </div>
                      <div className="bg-white py-1.5 px-3 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <p className="text-[9px] font-black text-gray-400 uppercase">Cartão</p>
                        </div>
                        <input
                          type="number"
                          value={empData.cardReceived || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleFinanceChange(employee.id, 'cardReceived', e.target.value)}
                          placeholder="0,00"
                          className="w-24 text-right font-black text-sm bg-transparent outline-none"
                        />
                      </div>
                      <div className="bg-white py-1.5 px-3 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <MinusCircle className="w-4 h-4 text-orange-500" />
                          <p className="text-[9px] font-black text-gray-400 uppercase">Sangria</p>
                        </div>
                        <input
                          type="number"
                          value={empData.sangria || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleFinanceChange(employee.id, 'sangria', e.target.value)}
                          placeholder="0,00"
                          className="w-24 text-right font-black text-sm bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="space-y-2">
                    <div className="bg-gray-100/50 p-2 rounded-xl flex justify-between text-[10px]">
                      <span className="text-gray-500 font-bold uppercase">Fundo de Caixa: {formatCurrency(empData.cashFloat)}</span>
                      <span className="text-gray-500 font-bold uppercase">Vendas: {totalSold} itens</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Divergência (R$)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                          <div className={cn(
                            "w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-black text-base flex items-center",
                            divergence < 0 ? "text-red-600" : divergence > 0 ? "text-green-600" : "text-gray-800"
                          )}>
                            {formatCurrency(divergence)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveTransaction(employee.id)}
                        className="bg-flu-green hover:bg-opacity-90 text-white px-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                      >
                        <Save className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase">Salvar</span>
                      </button>
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
