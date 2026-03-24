import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Edit2, Package, GripVertical } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Reorder } from 'motion/react';

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
    pdv: 25,
    commission: 1.8,
    quantity: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
      setEditingId(null);
    } else {
      setProducts([...products, { ...formData, id: crypto.randomUUID() }]);
    }
    setFormData({ name: '', description: '', pdv: 25, commission: 1.8, quantity: 0 });
    setIsAdding(false);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      pdv: product.pdv,
      commission: product.commission,
      quantity: product.quantity,
    });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, quantity: isNaN(newQuantity) ? 0 : newQuantity } : p));
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
          Contagem
        </h2>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ name: '', description: '', pdv: 25, commission: 1.8, quantity: 0 });
          }}
          className="bg-flu-maroon hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Cancelar' : 'Novo'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-flu-maroon/10 grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Nome do Produto</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-flu-maroon outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-flu-maroon outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">PDV (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.pdv}
                onChange={e => setFormData({ ...formData, pdv: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-flu-maroon outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Comissão (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.commission}
                onChange={e => setFormData({ ...formData, commission: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-flu-maroon outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-flu-maroon hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-bold transition-colors w-full"
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      )}

      <Reorder.Group axis="y" values={products} onReorder={setProducts} className="space-y-1">
        {products.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-500 italic rounded-xl border border-dashed border-gray-300">
            Nenhum produto cadastrado.
          </div>
        ) : (
          products.map(product => (
            <Reorder.Item 
              key={product.id} 
              value={product}
              className="bg-white py-1.5 px-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-2 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="cursor-grab active:cursor-grabbing p-1 text-gray-300">
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
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
                    className={cn(
                      "w-14 px-1 py-1 text-center font-black text-base rounded-lg border outline-none transition-all",
                      product.quantity <= 5 
                        ? "bg-red-50 border-red-200 text-red-700 focus:ring-red-500" 
                        : "bg-gray-50 border-gray-200 text-gray-700 focus:ring-flu-maroon focus:bg-white"
                    )}
                  />
                </div>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-1.5 text-gray-200 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Reorder.Item>
          ))
        )}
      </Reorder.Group>
    </div>
  );
}
