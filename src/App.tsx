/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Product, Employee, DistributionResult } from './types';
import { StockManager } from './components/StockManager';
import { EmployeeManager } from './components/EmployeeManager';
import { DistributionManager } from './components/DistributionManager';
import { ReturnManager } from './components/ReturnManager';
import { ReportViewer } from './components/ReportViewer';
import { LayoutDashboard, Package, Users, Share2, FileText, RotateCcw, Calculator } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ClosingManager } from './components/ClosingManager';

type Tab = 'home' | 'stock' | 'employees' | 'distribution' | 'returns' | 'reports' | 'closing';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'COPO Jogo', description: 'Jogo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '2', name: 'COPO Samuel Xavier', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '3', name: 'COPO Fabio Lib', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '4', name: 'COPO 1951', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '5', name: 'COPO 1969', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '6', name: 'COPO 1976', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '7', name: 'COPO John Kennedy', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '8', name: 'COPO Quarteto', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '9', name: 'COPO Cannobio', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '10', name: 'COPO Cordinha V.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '11', name: 'COPO Cordinha G.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '12', name: 'COPO Cordinha B.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '13', name: 'COPO Promo 10$', description: 'Promo 2/20', price: 10, commissionV: 1.0, commissionG: 1.2, quantity: 0 },
  { id: '14', name: 'COPO Promo 15$', description: 'Promo/15', price: 15, commissionV: 1.0, commissionG: 1.2, quantity: 0 },
  { id: '15', name: 'COPO 1902', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '16', name: 'COPO Bandeiras', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '17', name: 'COPO Sou Tricolor', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '18', name: 'COPO Fabio', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '19', name: 'COPO Cano L', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '20', name: 'COPO Cano Arg.', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '21', name: 'COPO America Del Flu', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '22', name: 'COPO Fabio 1391', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '23', name: 'COPO Guerreiras', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 }
];

export default function App() {
  const [products, setProducts] = useLocalStorage<Product[]>('stockflow_products', INITIAL_PRODUCTS);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('stockflow_employees', []);
  const [distribution, setDistribution] = useLocalStorage<DistributionResult | null>('stockflow_distribution', null);
  const [globalCashFloat, setGlobalCashFloat] = useLocalStorage<number>('stockflow_global_cash_float', 0);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const menuItems = [
    { id: 'stock', label: 'ESTOQUE', icon: Package },
    { id: 'employees', label: 'EQUIPE', icon: Users },
    { id: 'distribution', label: 'DISTRIBUIÇÃO', icon: Share2 },
    { id: 'returns', label: 'DEVOLUÇÃO', icon: RotateCcw },
    { id: 'reports', label: 'RELATÓRIOS', icon: FileText },
    { id: 'closing', label: 'FECHAMENTO', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Watermark Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.07] z-0 flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://escudosfc.com.br/images/fluminense.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '80% auto',
        }}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 fixed top-0 left-0 right-0 z-40 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 font-black text-xl text-flu-maroon tracking-tight">
            <img 
              src="https://escudosfc.com.br/images/fluminense.png" 
              alt="Fluminense Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            Maracana Fluminense
          </div>
          {activeTab !== 'home' && (
            <button 
              onClick={() => setActiveTab('home')}
              className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
            >
              Início
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pt-20 overflow-x-hidden relative z-10">
        <div className="max-w-md mx-auto h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'home' && (
                <div className="grid grid-cols-1 gap-2 pt-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as Tab)}
                        className="bg-white py-2 px-4 rounded-2xl shadow-md border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-all active:scale-95 group"
                      >
                        <div className="bg-flu-maroon/10 p-2 rounded-xl group-hover:bg-flu-maroon/20 transition-colors">
                          <Icon className="w-5 h-5 text-flu-maroon" />
                        </div>
                        <span className="text-sm font-black text-gray-800 tracking-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeTab === 'stock' && (
                <StockManager products={products} setProducts={setProducts} />
              )}
              {activeTab === 'employees' && (
                <EmployeeManager employees={employees} setEmployees={setEmployees} />
              )}
              {activeTab === 'distribution' && (
                <DistributionManager 
                  products={products} 
                  employees={employees} 
                  distribution={distribution}
                  setDistribution={setDistribution}
                  globalCashFloat={globalCashFloat}
                  setGlobalCashFloat={setGlobalCashFloat}
                />
              )}
              {activeTab === 'returns' && (
                <ReturnManager 
                  employees={employees}
                  distribution={distribution}
                  setDistribution={setDistribution}
                  globalCashFloat={globalCashFloat}
                />
              )}
              {activeTab === 'reports' && (
                <ReportViewer 
                  employees={employees}
                  distribution={distribution} 
                  globalCashFloat={globalCashFloat}
                />
              )}
              {activeTab === 'closing' && (
                <ClosingManager 
                  distribution={distribution}
                  globalCashFloat={globalCashFloat}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

