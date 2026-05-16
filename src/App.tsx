/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Product, Employee, DistributionResult, Transaction } from './types';
import { StockManager } from './components/StockManager';
import { EmployeeManager } from './components/EmployeeManager';
import { DistributionManager } from './components/DistributionManager';
import { ReturnManager } from './components/ReturnManager';
import { ReportViewer } from './components/ReportViewer';
import { HistoryManager } from './components/HistoryManager';
import { LayoutDashboard, Package, Users, Share2, FileText, RotateCcw, Calculator, History } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ClosingManager } from './components/ClosingManager';

type Tab = 'home' | 'stock' | 'employees' | 'distribution' | 'returns' | 'reports' | 'closing' | 'history';

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Copo Jogo', description: 'Jogo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '2', name: 'Copo Samuel Xavier', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '3', name: 'Copo Fabio Lib', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '4', name: 'Copo 1951', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '5', name: 'Copo 1969', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '6', name: 'Copo 1976', description: 'Jogo Antigo', price: 20, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '7', name: 'Copo John Kennedy', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '8', name: 'Copo Quarteto', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '9', name: 'Copo Cannobio', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '10', name: 'Copo Cordinha V.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '11', name: 'Copo Cordinha G.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '12', name: 'Copo Cordinha B.', description: 'Cordao', price: 25, commissionV: 2.5, commissionG: 1.5, quantity: 0 },
  { id: '13', name: 'Copo Jogo Antigo (Promo 2/20)', description: 'Promo 2/20', price: 10, commissionV: 1.0, commissionG: 1.2, quantity: 0 },
  { id: '14', name: 'Copo Promo 15$', description: 'Promo/15', price: 15, commissionV: 1.0, commissionG: 1.2, quantity: 0 },
  { id: '15', name: 'Copo 1902', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '16', name: 'Copo Bandeiras', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '17', name: 'Copo Sou Tricolor', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '18', name: 'Copo Fabio', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '19', name: 'Copo Cano L', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '20', name: 'Copo Cano Arg.', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '21', name: 'Copo America Del Flu', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '22', name: 'Copo Fabio 1391', description: 'Idolo', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '23', name: 'Copo Guerreiras', description: 'Outros', price: 25, commissionV: 1.8, commissionG: 1.2, quantity: 0 },
  { id: '24', name: 'Cachecol', description: 'Cachecol', price: 50, commissionV: 5, commissionG: 2, quantity: 0 }
];

export default function App() {
  const [products, setProducts] = useLocalStorage<Product[]>('stockflow_products', INITIAL_PRODUCTS);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('stockflow_employees', []);
  const [distribution, setDistribution] = useLocalStorage<DistributionResult | null>('stockflow_distribution', null);
  const [globalCashFloat, setGlobalCashFloat] = useLocalStorage<number>('stockflow_global_cash_float', 0);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('stockflow_transactions', []);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev].slice(0, 500)); // Keep last 500
  };

  const menuItems = [
    { id: 'stock', label: 'ESTOQUE', icon: Package },
    { id: 'employees', label: 'EQUIPE', icon: Users },
    { id: 'distribution', label: 'DISTRIBUIÇÃO', icon: Share2 },
    { id: 'returns', label: 'DEVOLUÇÃO', icon: RotateCcw },
    { id: 'reports', label: 'RELATÓRIOS', icon: FileText },
    { id: 'history', label: 'HISTÓRICO', icon: History },
    { id: 'closing', label: 'FECHAMENTO', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative overflow-hidden">
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

      {/* Navigation Sidebar (Desktop/Tablet) */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed top-0 left-0 bottom-0 z-50 shadow-sm">
        <div className="p-6 flex items-center gap-3 font-black text-xl text-flu-maroon tracking-tight border-b border-gray-100">
          <img 
            src="https://escudosfc.com.br/images/fluminense.png" 
            alt="Fluminense Logo" 
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="leading-tight">Maracanã</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Fluminense</span>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest",
              activeTab === 'home' ? "bg-flu-maroon text-white shadow-lg" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Painel Central
          </button>
          
          <div className="py-4">
            <div className="px-4 mb-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Gerenciamento</div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest",
                    activeTab === item.id ? "bg-flu-maroon text-white shadow-lg shadow-flu-maroon/20" : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Header (Hidden on md) */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 fixed top-0 left-0 right-0 z-40 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full px-2">
          <div className="flex items-center gap-3 font-black text-xl text-flu-maroon tracking-tight">
            <img 
              src="https://escudosfc.com.br/images/fluminense.png" 
              alt="Fluminense Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            Maracana Fluminense
          </div>
        </div>
      </header>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('home')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px]",
            activeTab === 'home' ? "text-flu-maroon" : "text-gray-400"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase">Home</span>
        </button>
        {menuItems.filter(item => ['stock', 'employees', 'distribution', 'returns', 'reports'].includes(item.id)).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px]",
                activeTab === item.id ? "text-flu-maroon" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 pt-20 pb-20 md:pb-4 overflow-x-hidden relative z-10 min-h-screen">
        <div className="max-w-4xl mx-auto h-full">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
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
                  addTransaction={addTransaction}
                />
              )}
              {activeTab === 'reports' && (
                <ReportViewer 
                  employees={employees}
                  distribution={distribution} 
                  globalCashFloat={globalCashFloat}
                />
              )}
              {activeTab === 'history' && (
                <HistoryManager 
                  transactions={transactions}
                  setTransactions={setTransactions}
                />
              )}
              {activeTab === 'closing' && (
                <ClosingManager 
                  distribution={distribution}
                  globalCashFloat={globalCashFloat}
                  addTransaction={addTransaction}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

