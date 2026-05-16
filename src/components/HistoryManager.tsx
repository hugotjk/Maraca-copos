import React from 'react';
import { Transaction } from '../types';
import { History, Trash2, ArrowUpRight, ArrowDownLeft, Receipt, RotateCcw, Calculator, FileSpreadsheet } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import * as XLSX from 'xlsx';

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

  const exportToXLSX = () => {
    if (transactions.length === 0) return;

    const data: any[] = [];

    transactions.forEach(t => {
      if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
          data.push({
            'Data': formatDate(t.timestamp),
            'Tipo': t.type.toUpperCase(),
            'Vendedor': t.employeeName || 'N/A',
            'Descrição': item.name,
            'Qtd Distribuída': item.distributed,
            'Qtd Devolvida': item.returned,
            'Qtd Vendida': item.sold,
            'Preço Unit.': item.price,
            'Total Item': item.sold * item.price
          });
        });
      } else {
        // For transactions without items (like expenses or sangria)
        data.push({
          'Data': formatDate(t.timestamp),
          'Tipo': t.type.toUpperCase(),
          'Vendedor': t.employeeName || 'N/A',
          'Descrição': t.description,
          'Qtd Distribuída': '-',
          'Qtd Devolvida': '-',
          'Qtd Vendida': '-',
          'Preço Unit.': '-',
          'Total Item': t.amount
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');

    // Auto-size columns
    const maxWidths = data.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString().length : 0;
        acc[i] = Math.max(acc[i] || 0, val, key.length);
      });
      return acc;
    }, []);
    worksheet['!cols'] = maxWidths.map((w: number) => ({ w: w + 2 }));

    XLSX.writeFile(workbook, `historico_vendas_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="flex items-center gap-2">
          {transactions.length > 0 && (
            <>
              <button
                onClick={exportToXLSX}
                className="bg-flu-green hover:bg-opacity-90 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-[10px] font-black min-w-[100px]"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Exportar XLSX
              </button>
              <button
                onClick={clearHistory}
                className="text-red-500 hover:text-red-600 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {transactions.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center text-gray-500 italic rounded-3xl border-2 border-dashed border-gray-200">
            Nenhuma transação registrada.
          </div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 h-fit">
              <div className="bg-gray-50 p-3 rounded-xl flex-shrink-0">
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-gray-800 text-sm truncate">{t.description}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                      {formatDate(t.timestamp)} {t.employeeName && `• ${t.employeeName}`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-black flex-shrink-0",
                    t.type === 'venda' || t.type === 'fechamento' ? "text-green-600" : 
                    t.type === 'despesa' || t.type === 'sangria' ? "text-red-600" : "text-blue-600"
                  )}>
                    {t.type === 'venda' || t.type === 'fechamento' ? '+' : '-'} {formatCurrency(t.amount)}
                  </span>
                </div>
                {t.details && (
                  <p className="text-[10px] text-gray-500 mt-1 italic truncate">{t.details}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
