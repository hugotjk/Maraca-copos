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
import { LayoutDashboard, Package, Users, Share2, FileText, RotateCcw } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'stock' | 'employees' | 'distribution' | 'returns' | 'reports';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'COPO Jogo', description: 'Jogo', pdv: 20, commission: 1.8, quantity: 0 },
  { id: '2', name: 'COPO Samuel Xavier', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '3', name: 'COPO Fabio Lib', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '4', name: 'COPO 1951', description: 'Jogo Antigo', pdv: 20, commission: 1.8, quantity: 0 },
  { id: '5', name: 'COPO 1969', description: 'Jogo Antigo', pdv: 20, commission: 1.8, quantity: 0 },
  { id: '6', name: 'COPO 1976', description: 'Jogo Antigo', pdv: 20, commission: 1.8, quantity: 0 },
  { id: '7', name: 'COPO John Kennedy', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '8', name: 'COPO Quarteto', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '9', name: 'COPO Cannobio', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '10', name: 'COPO Cordinha V.', description: 'Cordao', pdv: 25, commission: 2.5, quantity: 0 },
  { id: '11', name: 'COPO Cordinha G.', description: 'Cordao', pdv: 25, commission: 2.5, quantity: 0 },
  { id: '12', name: 'COPO Cordinha B.', description: 'Cordao', pdv: 25, commission: 2.5, quantity: 0 },
  { id: '13', name: 'COPO Promo 10$', description: 'Promo 2/20', pdv: 10, commission: 1.0, quantity: 0 },
  { id: '14', name: 'COPO Promo 15$', description: 'Promo/15', pdv: 15, commission: 1.0, quantity: 0 },
  { id: '15', name: 'COPO 1902', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '16', name: 'COPO Bandeiras', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '17', name: 'COPO Sou Tricolor', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '18', name: 'COPO Fabio', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '19', name: 'COPO Cano L', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '20', name: 'COPO Cano Arg.', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '21', name: 'COPO America Del Flu', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '22', name: 'COPO Fabio 1391', description: 'Idolo', pdv: 25, commission: 1.8, quantity: 0 },
  { id: '23', name: 'COPO Guerreiras', description: 'Outros', pdv: 25, commission: 1.8, quantity: 0 }
];

export default function App() {
  const [products, setProducts] = useLocalStorage<Product[]>('stockflow_products', INITIAL_PRODUCTS);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('stockflow_employees', []);
  const [distribution, setDistribution] = useLocalStorage<DistributionResult | null>('stockflow_distribution', null);
  const [globalCashFloat, setGlobalCashFloat] = useLocalStorage<number>('stockflow_global_cash_float', 0);
  const [activeTab, setActiveTab] = useState<Tab>('stock');

  const tabs = [
    { id: 'stock', label: 'Estoque', icon: Package },
    { id: 'employees', label: 'Equipe', icon: Users },
    { id: 'distribution', label: 'Distribuição', icon: Share2 },
    { id: 'returns', label: 'Devolução', icon: RotateCcw },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3 font-black text-xl text-flu-maroon tracking-tight">
          <img 
            src="https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png" 
            alt="Fluminense Logo" 
            className="w-8 h-8 object-contain"
            referrerPolicy="no-referrer"
          />
          Maracana Fluminense
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-x-hidden">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative",
                isActive ? "text-flu-maroon" : "text-gray-400"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute top-0 w-12 h-1 bg-flu-maroon rounded-b-full"
                />
              )}
              <Icon className={cn("w-6 h-6 mb-1", isActive ? "scale-110" : "scale-100")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

