import React, { useState, useRef } from 'react';
import { DistributionResult, Employee, Product, DistributionItem } from '../types';
import { FileText, Download, MessageCircle, Image as ImageIcon, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatCurrency, cn } from '../lib/utils';

interface ReportViewerProps {
  employees: Employee[];
  distribution: DistributionResult | null;
  globalCashFloat: number;
}

export function ReportViewer({ employees, distribution, globalCashFloat }: ReportViewerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<Record<string, 'distribution' | 'closing'>>({});
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const shareImage = async (employeeId: string) => {
    const element = reportRefs.current[employeeId];
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const type = reportType[employeeId] || 'distribution';
        const fileName = `${type}_${employeeId}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: type === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas',
            });
          } catch (err) {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        } else {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = URL.createObjectURL(blob);
          link.click();
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const shareOnWhatsApp = async (employeeId: string, employeeName: string, items: DistributionItem[], sector: string, data: any) => {
    const type = reportType[employeeId] || 'distribution';
    
    if (type === 'distribution') {
      const grouped = items.reduce((acc, item) => {
        const desc = item.product.description;
        if (!acc[desc]) {
          acc[desc] = { qty: 0, pdv: item.product.pdv };
        }
        acc[desc].qty += item.quantity;
        return acc;
      }, {} as Record<string, { qty: number; pdv: number }>);

      const totalProducts = Object.values(grouped).reduce((sum, i) => sum + (i.qty * i.pdv), 0);
      const grandTotal = totalProducts + globalCashFloat;

      const text = `*DISTRIBUIÇÃO: ${sector} - ${employeeName}*\n\n` +
        `*PRODUTO | QTDE | UNIT | TOTAL*\n` +
        Object.entries(grouped).map(([desc, info]) => 
          `${desc} | ${info.qty} | ${formatCurrency(info.pdv)} | ${formatCurrency(info.qty * info.pdv)}`
        ).join('\n') +
        `\n\n*FUNDO:* ${formatCurrency(globalCashFloat)}` +
        `\n*TOTAL:* ${formatCurrency(grandTotal)}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const totalSoldValue = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.pdv), 0);
      const totalCommission = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.commission), 0);
      const totalReceived = data.cashReceived + data.cardReceived + data.sangria;
      const expectedCash = totalSoldValue + globalCashFloat;
      const divergence = totalReceived - expectedCash;
      const finalCommission = Math.max(0, totalCommission + (divergence < 0 ? divergence : 0));

      const text = `*FECHAMENTO: ${sector} - ${employeeName}*\n\n` +
        `*TOTAL VENDIDO:* ${formatCurrency(totalSoldValue)}\n` +
        `*DIVERGÊNCIA:* ${formatCurrency(divergence)}\n` +
        `*COMISSÃO FINAL:* ${formatCurrency(finalCommission)}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const generatePDF = (employeeId?: string) => {
    if (!distribution) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('pt-BR');

    if (employeeId) {
      const data = distribution[employeeId];
      const type = reportType[employeeId] || 'distribution';
      
      doc.setFontSize(20);
      doc.text(type === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas', 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Funcionário: ${data.employee.name}`, 14, 35);
      doc.text(`Setor: ${data.employee.sector}`, 14, 42);
      doc.text(`Data: ${timestamp}`, 14, 49);

      if (type === 'distribution') {
        const groupedItems = data.items.reduce((acc, item) => {
          const desc = item.product.description;
          if (!acc[desc]) {
            acc[desc] = { quantity: 0, totalValue: 0, pdv: item.product.pdv, commission: item.product.commission };
          }
          acc[desc].quantity += item.quantity;
          acc[desc].totalValue += item.product.pdv * item.quantity;
          return acc;
        }, {} as Record<string, { quantity: number; totalValue: number; pdv: number; commission: number }>);

        const tableData = Object.entries(groupedItems).map(([description, info]) => [
          description,
          formatCurrency(info.pdv),
          formatCurrency(info.commission),
          info.quantity,
          formatCurrency(info.totalValue)
        ]);

        (doc as any).autoTable({
          startY: 60,
          head: [['Tipo / Descrição', 'PDV', 'Comissão', 'Qtd', 'Total']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [131, 0, 29] }
        });

        const totalValue = data.items.reduce((sum, i) => sum + (i.product.pdv * i.quantity), 0);
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Fundo de Caixa: ${formatCurrency(globalCashFloat)}`, 14, finalY);
        doc.setFontSize(14);
        doc.text(`Valor Total: ${formatCurrency(totalValue + globalCashFloat)}`, 14, finalY + 10);
      } else {
        const totalSoldValue = data.items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.pdv), 0);
        const totalCommission = data.items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.commission), 0);
        const totalReceived = data.cashReceived + data.cardReceived + data.sangria;
        const expectedCash = totalSoldValue + globalCashFloat;
        const divergence = totalReceived - expectedCash;
        const finalCommission = Math.max(0, totalCommission + (divergence < 0 ? divergence : 0));

        doc.text(`Total Vendido: ${formatCurrency(totalSoldValue)}`, 14, 60);
        doc.text(`Divergência: ${formatCurrency(divergence)}`, 14, 70);
        doc.text(`Comissão Final: ${formatCurrency(finalCommission)}`, 14, 80);
      }

      doc.save(`${type}_${data.employee.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } else {
      doc.setFontSize(20);
      doc.text('Resumo Geral de Distribuição', 14, 22);
      doc.setFontSize(12);
      doc.text(`Data de Geração: ${timestamp}`, 14, 32);

      const tableData = Object.values(distribution).map(data => [
        data.employee.name,
        data.employee.sector,
        data.items.reduce((sum, i) => sum + i.quantity, 0),
        formatCurrency(data.items.reduce((sum, i) => sum + (i.product.pdv * i.quantity), 0))
      ]);

      (doc as any).autoTable({
        startY: 40,
        head: [['Funcionário', 'Setor', 'Total Itens', 'Valor Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 100, 55] }
      });

      doc.save('resumo_geral_estoque.pdf');
    }
  };

  if (!distribution) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <FileText className="w-16 h-16 opacity-20" />
        <p className="text-lg italic">Realize uma distribuição para visualizar os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Relatórios
        </h2>
        <button
          onClick={() => generatePDF()}
          className="bg-flu-green hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold"
        >
          <Download className="w-4 h-4" />
          Resumo Geral (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {employees.map((employee) => {
          const data = distribution[employee.id];
          if (!data) return null;
          const { items } = data;
          const isSelected = selectedEmployeeId === employee.id;
          const type = reportType[employee.id] || 'distribution';
          
          const grouped = items.reduce((acc, item) => {
            const desc = item.product.description;
            if (!acc[desc]) {
              acc[desc] = { qty: 0, returned: 0, pdv: item.product.pdv, commission: item.product.commission };
            }
            acc[desc].qty += item.quantity;
            acc[desc].returned += item.returned;
            return acc;
          }, {} as Record<string, { qty: number; returned: number; pdv: number; commission: number }>);
          
          const totalProducts = Object.values(grouped).reduce((sum, i) => sum + (i.qty * i.pdv), 0);
          const grandTotal = totalProducts + globalCashFloat;

          const totalSoldValue = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.pdv), 0);
          const totalCommission = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.commission), 0);
          const totalReceived = data.cashReceived + data.cardReceived + data.sangria;
          const expectedCash = totalSoldValue + globalCashFloat;
          const divergence = totalReceived - expectedCash;
          const finalCommission = Math.max(0, totalCommission + (divergence < 0 ? divergence : 0));

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
                  <p className="text-[9px] font-black text-gray-400 uppercase">Status</p>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    data.cashReceived + data.cardReceived > 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {data.cashReceived + data.cardReceived > 0 ? 'Fechado' : 'Pendente'}
                  </span>
                </div>
              </button>

              {isSelected && (
                <div className="p-4 border-t border-gray-100 space-y-4 bg-gray-50/50">
                  <div className="flex justify-center">
                    <div className="flex bg-gray-200 p-1 rounded-lg w-full max-w-[260px]">
                      <button
                        onClick={() => setReportType(prev => ({ ...prev, [employee.id]: 'distribution' }))}
                        className={cn(
                          "flex-1 px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                          type === 'distribution' ? "bg-white text-flu-maroon shadow-sm" : "text-gray-500"
                        )}
                      >
                        Distribuição
                      </button>
                      <button
                        onClick={() => setReportType(prev => ({ ...prev, [employee.id]: 'closing' }))}
                        className={cn(
                          "flex-1 px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                          type === 'closing' ? "bg-white text-flu-maroon shadow-sm" : "text-gray-500"
                        )}
                      >
                        Fechamento
                      </button>
                    </div>
                  </div>

                  {/* Visual Report Template (System Look) */}
                  <div className="flex justify-center overflow-hidden py-4 bg-gray-100 rounded-xl">
                    <div 
                      ref={el => reportRefs.current[employee.id] = el}
                      className="bg-white w-[350px] font-sans text-gray-900 p-6 flex flex-col gap-6"
                    >
                      {/* System Header */}
                      <div className="flex flex-col gap-1 border-b-2 border-flu-maroon pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <img 
                              src="https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png" 
                              alt="Logo" 
                              className="w-6 h-6 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <h1 className="text-lg font-black tracking-tighter text-flu-maroon uppercase">Maracana Flu</h1>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {type === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas'}
                          </span>
                          <span className="text-lg font-black uppercase">{employee.sector} - {employee.name}</span>
                        </div>
                      </div>
                      
                      {/* Modern Table */}
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                          <div>Produto</div>
                          <div className="text-center">{type === 'distribution' ? 'Qtd' : 'Vend'}</div>
                          <div className="text-right">Unit</div>
                          <div className="text-right">Total</div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {Object.entries(grouped).map(([desc, info], idx) => {
                            const qty = type === 'distribution' ? info.qty : (info.qty - info.returned);
                            const pdv = type === 'distribution' ? info.pdv : info.commission;
                            const total = qty * pdv;
                            
                            if (qty <= 0 && type === 'closing') return null;

                            return (
                              <div key={idx} className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-xs font-bold bg-gray-50 rounded-lg p-2 items-center">
                                <div className="truncate pr-2">{desc}</div>
                                <div className="text-center bg-white rounded-md py-1 shadow-sm">{qty}</div>
                                <div className="text-right text-gray-500">{formatCurrency(pdv)}</div>
                                <div className="text-right text-flu-green">{formatCurrency(total)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* System Footer */}
                      <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                        {type === 'distribution' ? (
                          <>
                            <div className="flex justify-between items-center px-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fundo de Caixa</span>
                              <span className="text-sm font-bold text-gray-600">{formatCurrency(globalCashFloat)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-flu-maroon text-white p-4 rounded-xl shadow-lg shadow-red-100">
                              <span className="text-xs font-black uppercase tracking-widest">Valor Total</span>
                              <span className="text-xl font-black">{formatCurrency(grandTotal)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2 px-2">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-gray-400 uppercase">Total Vendido</span>
                                <span className="text-xs font-bold">{formatCurrency(totalSoldValue)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-gray-400 uppercase">Divergência</span>
                                <span className={cn("text-xs font-bold", divergence < 0 ? "text-red-600" : "text-flu-green")}>
                                  {formatCurrency(divergence)}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-flu-green text-white p-4 rounded-xl shadow-lg shadow-green-100">
                              <span className="text-xs font-black uppercase tracking-widest">Pagar ao Func.</span>
                              <span className="text-xl font-black">{formatCurrency(finalCommission)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">Maracana Fluminense Digital</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => shareImage(employee.id)}
                      className="flex-1 min-w-[140px] bg-flu-maroon hover:bg-opacity-90 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartilhar Foto
                    </button>
                    <button
                      onClick={() => shareOnWhatsApp(employee.id, employee.name, items, employee.sector, data)}
                      className="flex-1 min-w-[140px] bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
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
