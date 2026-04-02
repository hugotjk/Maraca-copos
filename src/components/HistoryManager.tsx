import React from 'react';
import { Transaction } from '../types';
import { History, Trash2, ArrowUpRight, ArrowDownLeft, Receipt, RotateCcw, Calculator } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface HistoryManagerProps {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
}

export function HistoryManager({ transactions, setTransactions }: HistoryManagerProps) {
  const clearHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setTransactions([]);
    }
  };

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'venda': return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'devolucao': return <RotateCcw className="w-4 h-4 text-blue-500" />;
      case 'despesa': return <ArrowDownLeft className="w-4 h-4 text-red-500" />;
      case 'sangria': return <Receipt className="w-4 h-4 text-orange-500" />;
      case 'fechamento': return <Calculator className="w-4 h-4 text-purple-500" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History className="w-6 h-6" />
          Histórico
        </h2>
        {transactions.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-red-500 hover:text-red-600 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="bg-white p-12 text-center text-gray-500 italic rounded-3xl border-2 border-dashed border-gray-200">
            Nenhuma transação registrada.
          </div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-gray-50 p-3 rounded-xl">
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-gray-800 text-sm truncate">{t.description}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {formatDate(t.timestamp)} {t.employeeName && `• ${t.employeeName}`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-black",
                    t.type === 'venda' || t.type === 'fechamento' ? "text-green-600" : 
                    t.type === 'despesa' || t.type === 'sangria' ? "text-red-600" : "text-blue-600"
                  )}>
                    {t.type === 'venda' || t.type === 'fechamento' ? '+' : '-'} {formatCurrency(t.amount)}
                  </span>
                </div>
                {t.details && (
                  <p className="text-[10px] text-gray-500 mt-1 italic">{t.details}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
