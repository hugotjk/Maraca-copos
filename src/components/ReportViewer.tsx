import React, { useState, useRef, useMemo } from 'react';
import { DistributionResult, Employee } from '../types';
import { FileText, Download, MessageCircle } from 'lucide-react';
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
  const [globalReportType, setGlobalReportType] = useState<'distribution' | 'closing'>('distribution');
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const shareOnWhatsApp = async (employeeId: string) => {
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
        const fileName = `relatorio_${employeeId}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: globalReportType === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas',
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

  const grandTotalGeneralCommission = useMemo(() => {
    if (!distribution) return 0;
    return Object.values(distribution).reduce((acc, empData) => {
      const totalCG = empData.items.reduce((sum, i) => {
        const sold = i.quantity - i.returned;
        return sum + (sold * (i.product.commissionG || 0));
      }, 0);
      return acc + totalCG;
    }, 0);
  }, [distribution]);

  const gestorReport = useMemo(() => {
    if (!distribution) return null;
    const allItems: { product: any, quantity: number, returned: number }[] = [];
    Object.values(distribution).forEach(empData => {
      empData.items.forEach(item => {
        allItems.push(item);
      });
    });

    const groups: Record<string, { description: string, sold: number, unitCG: number, totalCG: number }> = {};
    allItems.forEach(item => {
      const desc = item.product.description || item.product.name;
      const sold = (Number(item.quantity) || 0) - (Number(item.returned) || 0);
      const commissionG = Number(item.product.commissionG) || 0;
      if (sold <= 0) return;
      if (!groups[desc]) {
        groups[desc] = { description: desc, sold: 0, unitCG: commissionG, totalCG: 0 };
      }
      groups[desc].sold += sold;
      groups[desc].totalCG += sold * commissionG;
    });

    return Object.values(groups);
  }, [distribution]);

  const generatePDF = (employeeId?: string) => {
    if (!distribution) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('pt-BR');

    if (employeeId) {
      const data = distribution[employeeId];
      const type = globalReportType;
      
      doc.setFontSize(20);
      doc.text(type === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas', 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Funcionário: ${data.employee.name}`, 14, 35);
      doc.text(`Setor: ${data.employee.sector}`, 14, 42);
      doc.text(`Data: ${timestamp}`, 14, 49);

      if (type === 'distribution') {
        const tableData = data.items.map(item => [
          item.product.name,
          formatCurrency(item.product.price),
          formatCurrency(item.product.commissionV),
          item.quantity,
          formatCurrency(item.product.price * item.quantity)
        ]);

        (doc as any).autoTable({
          startY: 60,
          head: [['Produto', 'Preço', 'Comissão V.', 'Qtd', 'Total']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [131, 0, 29] }
        });

        const totalValue = data.items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Fundo de Caixa: ${formatCurrency(globalCashFloat)}`, 14, finalY);
        doc.setFontSize(14);
        doc.text(`Valor Total: ${formatCurrency(totalValue + globalCashFloat)}`, 14, finalY + 10);
      } else {
        const totalSoldValue = data.items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.price), 0);
        const totalCommission = data.items.reduce((sum, i) => sum + ((i.quantity - i.returned) * i.product.commissionV), 0);
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
        formatCurrency(data.items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0))
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

      {/* Global Filter */}
      <div className="flex justify-center">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-full max-w-[320px]">
          <button
            onClick={() => setGlobalReportType('distribution')}
            className={cn(
              "flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
              globalReportType === 'distribution' ? "bg-flu-maroon text-white shadow-md" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Distribuição
          </button>
          <button
            onClick={() => setGlobalReportType('closing')}
            className={cn(
              "flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
              globalReportType === 'closing' ? "bg-flu-maroon text-white shadow-md" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Fechamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {employees.map((employee) => {
          const data = distribution[employee.id];
          if (!data) return null;
          const { items } = data;
          const isSelected = selectedEmployeeId === employee.id;
          
          const totalProductsValue = items.reduce((sum, i) => sum + (i.quantity * (i.product.price || 0)), 0);
          const grandTotalDist = totalProductsValue + globalCashFloat;

          const totalSoldValue = items.reduce((sum, i) => sum + ((i.quantity - i.returned) * (i.product.price || 0)), 0);
          const totalCommission = items.reduce((sum, i) => {
            const sold = i.quantity - i.returned;
            return sum + (sold * (i.product.commissionV || 0));
          }, 0);
          
          const totalReceived = data.cashReceived + data.cardReceived + data.sangria;
          const expectedCash = totalSoldValue + data.cashFloat;
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
                  {/* Visual Report Template */}
                  <div className="flex justify-center overflow-hidden py-4 bg-gray-100 rounded-xl">
                    <div 
                      ref={el => reportRefs.current[employee.id] = el}
                      className="bg-white w-[350px] font-sans text-gray-900 p-6 flex flex-col gap-6"
                    >
                      {/* System Header matching screenshot */}
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <img 
                              src="https://escudosfc.com.br/images/fluminense.png" 
                              alt="Logo" 
                              className="w-8 h-8 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <h1 className="text-xl font-black tracking-tighter text-flu-maroon uppercase">Maracana Flu</h1>
                          </div>
                          <span className="text-[11px] font-bold text-gray-400">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>

                        <div className="flex flex-col -mt-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {globalReportType === 'distribution' ? 'Relatório de Distribuição' : 'Fechamento de Vendas'}
                          </span>
                          <span className="text-xl font-black uppercase text-gray-800">{employee.sector} - {employee.name}</span>
                        </div>

                        <div className="h-[2px] bg-flu-maroon w-full"></div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                          <div>Descrição</div>
                          <div className="text-center">{globalReportType === 'distribution' ? 'Qtd' : 'Vend'}</div>
                          <div className="text-right">{globalReportType === 'distribution' ? 'PDV' : 'Comis. V'}</div>
                          <div className="text-right">Total</div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {globalReportType === 'distribution' ? (
                            (() => {
                              const groups: Record<string, { description: string, quantity: number, unitPrice: number, totalPrice: number }> = {};
                              items.forEach(item => {
                                const desc = item.product.description || item.product.name;
                                const price = Number(item.product.price) || 0;
                                if (!groups[desc]) {
                                  groups[desc] = { description: desc, quantity: 0, unitPrice: price, totalPrice: 0 };
                                }
                                groups[desc].quantity += (Number(item.quantity) || 0);
                                groups[desc].totalPrice += (Number(item.quantity) || 0) * price;
                              });
                              return Object.values(groups).map((group, idx) => (
                                <div key={idx} className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-xs font-bold bg-gray-50 rounded-2xl p-3 items-center">
                                  <div className="truncate pr-2 text-gray-800">{group.description}</div>
                                  <div className="flex justify-center">
                                    <span className="bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100 min-w-[35px] text-center">{group.quantity}</span>
                                  </div>
                                  <div className="text-right text-gray-400 font-medium">{formatCurrency(group.unitPrice)}</div>
                                  <div className="text-right text-flu-green font-black">{formatCurrency(group.totalPrice)}</div>
                                </div>
                              ));
                            })()
                          ) : (
                            (() => {
                              const groups: Record<string, { description: string, sold: number, unitCV: number, totalCV: number }> = {};
                              items.forEach(item => {
                                const desc = item.product.description || item.product.name;
                                const sold = (Number(item.quantity) || 0) - (Number(item.returned) || 0);
                                const commissionV = Number(item.product.commissionV) || 0;
                                if (sold <= 0) return;
                                if (!groups[desc]) {
                                  groups[desc] = { description: desc, sold: 0, unitCV: commissionV, totalCV: 0 };
                                }
                                groups[desc].sold += sold;
                                groups[desc].totalCV += sold * commissionV;
                              });
                              return Object.values(groups).map((group, idx) => (
                                <div key={idx} className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-xs font-bold bg-gray-50 rounded-2xl p-3 items-center">
                                  <div className="truncate pr-2 text-gray-800">{group.description}</div>
                                  <div className="flex justify-center">
                                    <span className="bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100 min-w-[35px] text-center">{group.sold}</span>
                                  </div>
                                  <div className="text-right text-gray-400 font-medium">{formatCurrency(group.unitCV)}</div>
                                  <div className="text-right text-flu-green font-black">{formatCurrency(group.totalCV)}</div>
                                </div>
                              ));
                            })()
                          )}
                        </div>
                      </div>

                      {/* System Footer matching screenshot */}
                      <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                        {globalReportType === 'distribution' ? (
                          <>
                            <div className="flex justify-between items-center px-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fundo de Caixa</span>
                              <span className="text-sm font-black text-gray-800">{formatCurrency(globalCashFloat)}</span>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Valor Total</span>
                              <span className="text-xl font-black text-gray-800">{formatCurrency(grandTotalDist)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 px-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Vendido</span>
                                <span className="text-sm font-black text-gray-800">{formatCurrency(totalSoldValue)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Divergência</span>
                                <span className={cn("text-sm font-black", divergence < 0 ? "text-red-600" : "text-flu-green")}>
                                  {formatCurrency(divergence)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Pagamento Func.</span>
                              <span className="text-xl font-black text-gray-800">{formatCurrency(finalCommission)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">Maracana Fluminense Digital</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex pt-2">
                    <button
                      onClick={() => shareOnWhatsApp(employee.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold text-sm"
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
        {/* GESTOR Section (Moved to end and total hidden in header) */}
        {globalReportType === 'closing' && (
          <div className="bg-white rounded-2xl shadow-md border border-flu-maroon/20 overflow-hidden">
            <button 
              onClick={() => setSelectedEmployeeId(selectedEmployeeId === 'gestor' ? null : 'gestor')}
              className="w-full p-3 flex justify-between items-center bg-flu-maroon text-white hover:bg-flu-maroon/90 transition-colors text-left"
            >
              <div>
                <h3 className="font-black text-base uppercase">GESTOR</h3>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Comissão Geral (G)</p>
              </div>
              {selectedEmployeeId === 'gestor' && (
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/60 uppercase">Total G</p>
                  <span className="text-base font-black">
                    {formatCurrency(grandTotalGeneralCommission)}
                  </span>
                </div>
              )}
            </button>

            {selectedEmployeeId === 'gestor' && gestorReport && (
              <div className="p-4 space-y-4 bg-gray-50/50">
                <div className="flex justify-center overflow-hidden py-4 bg-gray-100 rounded-xl">
                  <div 
                    ref={el => reportRefs.current['gestor'] = el}
                    className="bg-white w-[350px] font-sans text-gray-900 p-6 flex flex-col gap-6"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header matching screenshot */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <img 
                            src="https://escudosfc.com.br/images/fluminense.png" 
                            alt="Logo" 
                            className="w-8 h-8 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <h1 className="text-xl font-black tracking-tighter text-flu-maroon uppercase">Maracana Flu</h1>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>

                      <div className="flex flex-col -mt-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relatório de Gestão</span>
                        <span className="text-xl font-black uppercase text-gray-800">GESTOR - COMISSÃO G</span>
                      </div>

                      <div className="h-[2px] bg-flu-maroon w-full"></div>

                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                          <div>Descrição</div>
                          <div className="text-center">Vend</div>
                          <div className="text-right">Comis. G</div>
                          <div className="text-right">Total</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {gestorReport.map((group, idx) => (
                            <div key={idx} className="grid grid-cols-[1.5fr_0.5fr_1fr_1fr] text-xs font-bold bg-gray-50 rounded-2xl p-3 items-center">
                              <div className="truncate pr-2 text-gray-800">{group.description}</div>
                              <div className="flex justify-center">
                                <span className="bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100 min-w-[35px] text-center">{group.sold}</span>
                              </div>
                              <div className="text-right text-gray-400 font-medium">{formatCurrency(group.unitCG)}</div>
                              <div className="text-right text-flu-green font-black">{formatCurrency(group.totalCG)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Comissão G</span>
                        <span className="text-xl font-black text-gray-800">{formatCurrency(grandTotalGeneralCommission)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex">
                  <button
                    onClick={() => shareOnWhatsApp('gestor')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
