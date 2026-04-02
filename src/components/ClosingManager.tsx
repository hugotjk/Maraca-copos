import React, { useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Calculator, TrendingUp, CreditCard, Banknote, Receipt, ArrowRight, Info, Users, FileDown, Save } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { DistributionResult, Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OperationData {
  id: string;
  name: string;
  cash: number;
  card: number;
  employeeCount: number;
}

interface ClosingManagerProps {
  distribution: DistributionResult | null;
  globalCashFloat: number;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
}

const INITIAL_OPERATIONS: OperationData[] = [
  { id: 'leste_inf_fora', name: 'Leste Inf. Fora', cash: 0, card: 0, employeeCount: 1 },
  { id: 'leste_inf_dentro', name: 'Leste Inf. Dentro', cash: 0, card: 0, employeeCount: 1 },
  { id: 'leste_sup', name: 'Leste Sup.', cash: 0, card: 0, employeeCount: 1 },
];

export function ClosingManager({ distribution, globalCashFloat, addTransaction }: ClosingManagerProps) {
  const [operations, setOperations] = useLocalStorage<OperationData[]>('stockflow_closing_data_v3', INITIAL_OPERATIONS);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  // Calculate COPOS totals from distribution
  const coposData = useMemo(() => {
    if (!distribution) return { cash: 0, card: 0, commission: 0 };

    return Object.values(distribution).reduce((acc, empData) => {
      const totalCommission = empData.items.reduce((sum, i) => {
        const sold = i.quantity - i.returned;
        return sum + (sold * (i.product.commissionV || 0));
      }, 0);

      return {
        cash: acc.cash + empData.cashReceived + empData.sangria - empData.cashFloat,
        card: acc.card + empData.cardReceived,
        commission: acc.commission + totalCommission,
      };
    }, { cash: 0, card: 0, commission: 0 });
  }, [distribution]);

  const updateOperation = (id: string, field: keyof OperationData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, [field]: numValue } : op
    ));
  };

  const calculateOpExpenses = (op: OperationData) => {
    const venda = op.cash + op.card;
    const despesaV = (venda * 0.05) / (op.employeeCount || 1);
    const despesaG = venda * 0.04;
    const despesaFixa = op.id === 'leste_inf_fora' ? 120 : 0;
    // Total despesa = (despesaV * num_funcionarios) + despesaG + despesaFixa
    const total = (despesaV * (op.employeeCount || 1)) + despesaG + despesaFixa;
    
    return { despesaV, despesaG, despesaFixa, total };
  };

  const calculateTotals = () => {
    const manualTotals = operations.reduce((acc, op) => {
      const venda = op.cash + op.card;
      const expenses = calculateOpExpenses(op);
      const balance = op.cash - expenses.total;
      
      return {
        totalCash: acc.totalCash + op.cash,
        totalCard: acc.totalCard + op.card,
        totalSum: acc.totalSum + venda,
        totalExpenses: acc.totalExpenses + expenses.total,
        totalBalance: acc.totalBalance + balance,
      };
    }, {
      totalCash: 0,
      totalCard: 0,
      totalSum: 0,
      totalExpenses: 0,
      totalBalance: 0,
    });

    // Add COPOS data
    const coposSum = coposData.cash + coposData.card;
    const coposBalance = coposData.cash - coposData.commission;

    return {
      totalCash: manualTotals.totalCash + coposData.cash,
      totalCard: manualTotals.totalCard + coposData.card,
      totalSum: manualTotals.totalSum + coposSum,
      totalExpenses: manualTotals.totalExpenses + coposData.commission,
      totalBalance: manualTotals.totalBalance + coposBalance,
    };
  };

  const totals = calculateTotals();

  const handleSaveClosing = () => {
    // Record total sales
    addTransaction({
      type: 'fechamento',
      description: 'Fechamento de Caixa Geral',
      amount: totals.totalBalance,
      details: `Venda Total: ${formatCurrency(totals.totalSum)} | Despesas: ${formatCurrency(totals.totalExpenses)}`
    });

    // Record individual expenses
    operations.forEach(op => {
      const expenses = calculateOpExpenses(op);
      if (expenses.total > 0) {
        addTransaction({
          type: 'despesa',
          description: `Despesas - ${op.name}`,
          amount: expenses.total,
          details: `V (5%/F): ${formatCurrency(expenses.despesaV)} | G (4%): ${formatCurrency(expenses.despesaG)}`
        });
      }
    });

    if (coposData.commission > 0) {
      addTransaction({
        type: 'despesa',
        description: 'Despesas - COPOS (Comissão)',
        amount: coposData.commission
      });
    }

    alert('Fechamento registrado no histórico com sucesso!');
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(128, 0, 0); // Maroon
    doc.text('RELATÓRIO DE FECHAMENTO', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${date} - ${time}`, 105, 22, { align: 'center' });

    // 1. Operações Manuais
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('RESUMO POR OPERAÇÃO', 14, 35);

    const opRows = operations.map(op => {
      const venda = op.cash + op.card;
      const expenses = calculateOpExpenses(op);
      const balance = op.cash - expenses.total;
      return [
        op.name,
        formatCurrency(venda),
        formatCurrency(op.cash),
        formatCurrency(op.card),
        formatCurrency(expenses.total),
        formatCurrency(balance)
      ];
    });

    // Add COPOS to operations table
    const coposSum = coposData.cash + coposData.card;
    const coposBalance = coposData.cash - coposData.commission;
    opRows.push([
      'COPOS (Auto)',
      formatCurrency(coposSum),
      formatCurrency(coposData.cash),
      formatCurrency(coposData.card),
      formatCurrency(coposData.commission),
      formatCurrency(coposBalance)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Operação', 'Venda Total', 'Dinheiro', 'Cartão', 'Despesas', 'Saldo CX']],
      body: opRows,
      theme: 'striped',
      headStyles: { fillColor: [128, 0, 0] },
      styles: { fontSize: 8 }
    });

    // 2. Resumo por Categoria (Copo, Cordao, Cachecol)
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('RESUMO DE VENDAS POR CATEGORIA', 14, currentY);

    const categoryData = {
      copo: 0,
      cordao: 0,
      cachecol: 0
    };

    if (distribution) {
      Object.values(distribution).forEach(empData => {
        empData.items.forEach(item => {
          const sold = item.quantity - item.returned;
          const value = sold * item.product.price;
          const name = item.product.name.toLowerCase();
          const desc = item.product.description.toLowerCase();

          if (name.includes('copo')) categoryData.copo += value;
          if (desc.includes('cordao') || name.includes('cordao')) categoryData.cordao += value;
          if (name.includes('cachecol') || desc.includes('cachecol')) categoryData.cachecol += value;
        });
      } );
    }

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Categoria', 'Valor Vendido']],
      body: [
        ['Copo', formatCurrency(categoryData.copo)],
        ['Cordão', formatCurrency(categoryData.cordao)],
        ['Cachecol', formatCurrency(categoryData.cachecol)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [128, 0, 0] },
      styles: { fontSize: 10 }
    });

    // 3. Resumo Geral
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('RESUMO GERAL', 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      body: [
        ['Venda em Dinheiro', formatCurrency(totals.totalCash)],
        ['Total Cartão', formatCurrency(totals.totalCard)],
        ['Venda Total', formatCurrency(totals.totalSum)],
        ['Total Despesas', formatCurrency(totals.totalExpenses)],
        ['SALDO FINAL', formatCurrency(totals.totalBalance)]
      ],
      theme: 'plain',
      styles: { fontSize: 11, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 } }
    });

    doc.save(`Fechamento_${date.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-flu-maroon" />
          <h2 className="text-xl font-black text-gray-800 tracking-tight text-flu-maroon uppercase">Fechamento</h2>
        </div>
        {!distribution && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
            <Info className="w-3 h-3" />
            SEM DADOS DE COPOS
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* COPOS Section - Automatic */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-flu-maroon/20 overflow-hidden">
          <div className="bg-flu-maroon px-4 py-3 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-black text-white text-sm tracking-tight uppercase">COPOS</span>
              <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Dados Automáticos</span>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                <span className="text-[10px] font-bold text-white/50 block leading-none uppercase">Venda</span>
                <span className="text-xs font-black text-white">{formatCurrency(coposData.cash + coposData.card)}</span>
              </div>
              <div className="bg-white text-flu-maroon px-2 py-1 rounded-lg shadow-sm">
                <span className="text-[10px] font-bold opacity-70 block leading-none uppercase">Saldo CX</span>
                <span className="text-xs font-black">{formatCurrency(coposData.cash - coposData.commission)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 gap-4 bg-flu-maroon/5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Dinheiro
              </label>
              <div className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-black text-gray-800">
                {formatCurrency(coposData.cash)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Cartão
              </label>
              <div className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-black text-gray-800">
                {formatCurrency(coposData.card)}
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Despesas
              </label>
              <div className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-normal text-black">
                {formatCurrency(coposData.commission)}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Operations */}
        {operations.map((op) => {
          const venda = op.cash + op.card;
          const expenses = calculateOpExpenses(op);
          const balance = op.cash - expenses.total;

          return (
            <div key={op.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-black text-gray-600 text-sm tracking-tight uppercase">{op.name}</span>
                <div className="flex gap-2">
                  <div className="bg-white px-2 py-1 rounded-lg border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 block leading-none uppercase">Venda</span>
                    <span className="text-xs font-black text-gray-600">{formatCurrency(venda)}</span>
                  </div>
                  <div className="bg-gray-800 text-white px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-bold opacity-70 block leading-none uppercase">Saldo CX</span>
                    <span className="text-xs font-black">{formatCurrency(balance)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Banknote className="w-3 h-3" /> Dinheiro
                    </label>
                    <input
                      type="number"
                      value={op.cash || ''}
                      onChange={(e) => updateOperation(op.id, 'cash', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-flu-maroon/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Cartão
                    </label>
                    <input
                      type="number"
                      value={op.card || ''}
                      onChange={(e) => updateOperation(op.id, 'card', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-flu-maroon/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3" /> Funcionários
                    </label>
                    <input
                      type="number"
                      value={op.employeeCount || ''}
                      onChange={(e) => updateOperation(op.id, 'employeeCount', e.target.value)}
                      placeholder="1"
                      className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-flu-maroon/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    <span className="text-[9px] font-black text-black uppercase">Total Despesas</span>
                    <span className="text-sm font-black text-black">{formatCurrency(expenses.total)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-y-2 gap-x-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Despesa V (5%/F)</span>
                    <span className="text-xs font-bold text-gray-700">{formatCurrency(expenses.despesaV)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Despesa G (4%)</span>
                    <span className="text-xs font-bold text-gray-700">{formatCurrency(expenses.despesaG)}</span>
                  </div>
                  {expenses.despesaFixa > 0 && (
                    <div className="flex justify-between items-center col-span-2 border-t border-gray-200 pt-1 mt-1">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Despesa Fixa</span>
                      <span className="text-xs font-bold text-gray-700">{formatCurrency(expenses.despesaFixa)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo Final */}
      <div className="bg-white rounded-3xl p-6 text-gray-900 shadow-xl border-2 border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <TrendingUp className="w-24 h-24 text-flu-maroon" />
        </div>
        
        <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2 text-flu-maroon">
          <ArrowRight className="w-5 h-5" />
          RESUMO GERAL
        </h3>

        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-end border-b border-gray-100 pb-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Venda em Dinheiro</span>
              <span className="text-xl font-black text-gray-800">{formatCurrency(totals.totalCash)}</span>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Cartão</span>
              <span className="text-xl font-black text-gray-800">{formatCurrency(totals.totalCard)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Venda</span>
            <span className="text-lg font-black text-flu-maroon">{formatCurrency(totals.totalSum)}</span>
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Despesas</span>
            <span className="text-lg font-black text-black">{formatCurrency(totals.totalExpenses)}</span>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black tracking-widest text-gray-600">Saldo</span>
              <span className="text-3xl font-black text-green-600">{formatCurrency(totals.totalBalance)}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">
              * Saldo calculado como (Total Dinheiro - Total Despesas)
            </p>
          </div>
        </div>
      </div>

      {showClearConfirm ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col items-center gap-3">
          <span className="text-xs font-black text-red-600 uppercase tracking-tight">Deseja limpar os dados manuais?</span>
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => {
                setOperations(INITIAL_OPERATIONS);
                setShowClearConfirm(false);
              }}
              className="flex-1 bg-red-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Sim, Limpar
            </button>
            <button 
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button 
            onClick={handleSaveClosing}
            className="w-full py-4 bg-flu-green text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar no Histórico
          </button>

          <button 
            onClick={generatePDF}
            className="w-full py-4 bg-flu-maroon text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <FileDown className="w-4 h-4" />
            Gerar Relatório PDF
          </button>
          
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
          >
            Limpar Dados Manuais
          </button>
        </div>
      )}
    </div>
  );
}
