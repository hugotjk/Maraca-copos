import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Edit2, Package, GripVertical, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Reorder, useDragControls } from 'motion/react';

interface StockManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export function StockManager({ products, setProducts }: StockManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 25,
    commissionV: 1.8,
    commissionG: 0.5,
    quantity: 0,
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const syncFromSpreadsheet = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('https://docs.google.com/spreadsheets/d/1cghUaG5zUkN2hE3-B0x71kMwqC22bWjB-fyywR10sO4/export?format=csv');
      const csvText = await response.text();
      
      const rows = csvText.split('\n').slice(1); // Skip header
      const newProducts: Product[] = rows
        .filter(row => row.trim().length > 0)
        .map(row => {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              values.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current);

          if (values.length < 5) return null;
          
          const clean = (val: string) => {
            if (!val) return '0';
            let cleaned = val.replace(/^"|"$/g, '').replace(/[R$\s]/g, '').trim();
            // Handle Brazilian currency format (1.234,56)
            if (cleaned.includes(',') && cleaned.includes('.')) {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.includes(',')) {
              cleaned = cleaned.replace(',', '.');
            }
            return cleaned;
          };
          
          const name = clean(values[0]);
          const description = clean(values[1]);
          const price = parseFloat(clean(values[2]));
          const commissionV = parseFloat(clean(values[3]));
          const commissionG = parseFloat(clean(values[4]));
          const quantity = values.length >= 6 ? parseInt(clean(values[5])) : 0;
          
          const existing = products.find(p => p.name === name);
          
          return {
            id: existing?.id || crypto.randomUUID(),
            name,
            description,
            price: isNaN(price) ? 0 : price,
            commissionV: isNaN(commissionV) ? 0 : commissionV,
            commissionG: isNaN(commissionG) ? 0 : commissionG,
            quantity: isNaN(quantity) ? (existing?.quantity || 0) : quantity
          };
        })
        .filter((p): p is Product => p !== null);

      if (newProducts.length > 0) {
        setProducts(newProducts);
      }
    } catch (error) {
      console.error('Error syncing spreadsheet:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Note: To write back to Google Sheets, you need a Google Apps Script Web App URL.
  // I will implement the logic to call a hypothetical webhook.
  const writeToSpreadsheet = async (product: Product) => {
    console.log('Writing to spreadsheet:', product);
    
    // To enable this, the user needs to provide a Google Apps Script URL
    // via the VITE_APPS_SCRIPT_URL environment variable in Settings.
    const APPS_SCRIPT_URL = (import.meta as any).env.VITE_APPS_SCRIPT_URL;
    
    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script requires no-cors or specialized handling
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateProduct',
            product: {
              ...product,
              // Ensure we send numbers
              price: Number(product.price),
              commissionV: Number(product.commissionV),
              commissionG: Number(product.commissionG),
              quantity: Number(product.quantity)
            }
          }),
        });
      } catch (error) {
        console.error('Error writing to spreadsheet:', error);
      }
    }
  };

  // Removed automatic sync on mount as per user request
  // React.useEffect(() => {
  //   syncFromSpreadsheet();
  // }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct = { ...formData, id: editingId || crypto.randomUUID() };
    
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? newProduct : p));
      setEditingId(null);
    } else {
      setProducts([...products, newProduct]);
    }
    
    writeToSpreadsheet(newProduct);
    setFormData({ name: '', description: '', price: 25, commissionV: 1.8, commissionG: 0.5, quantity: 0 });
    setIsAdding(false);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      commissionV: product.commissionV,
      commissionG: product.commissionG,
      quantity: product.quantity,
    });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    const qty = isNaN(newQuantity) ? 0 : Math.max(0, newQuantity);
    const updatedProducts = products.map(p => p.id === id ? { ...p, quantity: qty } : p);
    setProducts(updatedProducts);
    
    const product = updatedProducts.find(p => p.id === id);
    if (product) {
      writeToSpreadsheet(product);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6" />
          Estoque
        </h2>
        <div className="flex flex-col gap-1">
          <button
            onClick={syncFromSpreadsheet}
            disabled={isSyncing}
            className="bg-flu-green hover:bg-opacity-90 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-[10px] font-black disabled:opacity-50 min-w-[100px]"
          >
            <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingId(null);
              setFormData({ name: '', description: '', price: 25, commissionV: 1.8, commissionG: 0.5, quantity: 0 });
            }}
            className="bg-flu-maroon hover:bg-opacity-90 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-[10px] font-black min-w-[100px]"
          >
            <Plus className="w-3 h-3" />
            {isAdding ? 'Cancelar' : 'Novo'}
          </button>
        </div>
      </div>

      <Reorder.Group axis="y" values={products} onReorder={setProducts} className="space-y-1">
        {products.length === 0 && !isAdding ? (
          <div className="bg-white p-8 text-center text-gray-500 italic rounded-xl border border-dashed border-gray-300">
            Nenhum produto cadastrado.
          </div>
        ) : (
          <>
            {isAdding && !editingId && (
              <ProductForm 
                formData={formData} 
                setFormData={setFormData} 
                handleSubmit={handleSubmit} 
                onCancel={() => setIsAdding(false)} 
              />
            )}
            {products.map(product => (
              <React.Fragment key={product.id}>
                <ProductItem 
                  product={product} 
                  handleEdit={handleEdit} 
                  handleDelete={handleDelete} 
                  handleQuantityChange={handleQuantityChange} 
                />
                {editingId === product.id && (
                  <div className="px-2 pb-2">
                    <ProductForm 
                      formData={formData} 
                      setFormData={setFormData} 
                      handleSubmit={handleSubmit} 
                      onCancel={() => {
                        setEditingId(null);
                        setIsAdding(false);
                      }} 
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </Reorder.Group>
    </div>
  );
}

function ProductForm({ formData, setFormData, handleSubmit, onCancel }: {
  formData: Omit<Product, 'id'>,
  setFormData: (data: Omit<Product, 'id'>) => void,
  handleSubmit: (e: React.FormEvent) => void,
  onCancel: () => void
}) {
  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-md border border-flu-maroon/10 grid grid-cols-1 gap-3 mb-2">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Produto</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 uppercase">Descrição</label>
        <input
          type="text"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase">PDV</label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase">Comis. V</label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.commissionV}
            onChange={e => setFormData({ ...formData, commissionV: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase">Comis. G</label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.commissionG}
            onChange={e => setFormData({ ...formData, commissionG: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase">Estoque</label>
          <input
            required
            type="number"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flu-maroon outline-none text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-xs"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-2 bg-flu-maroon text-white py-2 rounded-lg font-bold text-xs px-8"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

function ProductItem({ product, handleEdit, handleDelete, handleQuantityChange }: { 
  product: Product, 
  handleEdit: (p: Product) => void, 
  handleDelete: (id: string) => void,
  handleQuantityChange: (id: string, qty: number) => void,
  key?: React.Key
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={product}
      dragListener={false}
      dragControls={dragControls}
      className="bg-white py-1.5 px-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-2 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-gray-800 truncate">{product.name}</h3>
            <button 
              onClick={() => handleEdit(product)}
              className="text-gray-300 hover:text-flu-maroon transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Qtd</span>
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden pr-1">
            <input
              type="number"
              value={product.quantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
              className={cn(
                "w-12 py-1 text-center font-black text-sm bg-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                product.quantity <= 5 ? "text-red-700" : "text-gray-700"
              )}
            />
            <div className="flex flex-col border-l border-gray-200">
              <button 
                onClick={() => handleQuantityChange(product.id, product.quantity + 1)}
                className="px-1 text-gray-400 hover:text-flu-maroon transition-colors border-b border-gray-100"
              >
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
              <button 
                onClick={() => handleQuantityChange(product.id, product.quantity - 1)}
                className="px-1 text-gray-400 hover:text-flu-maroon transition-colors"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleDelete(product.id)}
          className="p-1.5 text-gray-200 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}
