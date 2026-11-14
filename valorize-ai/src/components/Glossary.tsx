import React from 'react';
import { BookOpen, Info, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscape } from '../lib/useEscape';

interface GlossaryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Glossary: React.FC<GlossaryProps> = ({ isOpen, onClose }) => {
  useEscape(isOpen, onClose);
  const tools = [
    {
      title: "Método de Graham",
      description: "Baseado na fórmula de Benjamin Graham (o mentor de Warren Buffett). É uma forma de saber o 'valor real' da empresa olhando para o que ela tem de patrimônio e o quanto ela lucra. Ajuda a não pagar caro demais por algo que não tem base sólida.",
      formula: "√ (22,5 × LPA × VPA)"
    },
    {
      title: "Método de Bazin",
      description: "Foca em quem quer receber 'aluguel' das ações (dividendos). Ele calcula o preço máximo que você pode pagar para receber pelo menos o yield mínimo escolhido (6% no clássico) de retorno em dinheiro na sua conta todo ano.",
      formula: "Dividendos / Yield Mínimo"
    },
    {
      title: "Analista IA",
      description: "Uma inteligência artificial (Gemini) explica de forma simples o modelo de negócio, os pontos fortes e os riscos da empresa, cruzando com os números de Graham e Bazin. Ela usa o conhecimento do próprio modelo e os dados do app — não consulta notícias em tempo real, então confira fatos recentes no site de RI da empresa.",
      formula: "Dados do app + conhecimento do modelo"
    },
    {
      title: "Margem de Segurança",
      description: "É o seu 'colchão de proteção'. Se o preço justo de uma ação é R$ 10,00 e você exige 20% de margem, você só compra se ela custar R$ 8,00. Isso te protege caso algo dê errado no mercado.",
      formula: "Preço Justo × (1 - Margem %)"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            role="dialog" aria-modal="true" aria-labelledby="glossary-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-emerald-50 border-b border-emerald-100 p-6 text-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-emerald-600" />
                <h2 id="glossary-title" className="text-xl font-bold tracking-tight uppercase">Guia de Ferramentas</h2>
              </div>
              <button onClick={onClose} className="hover:bg-emerald-100 p-2 rounded-full transition-colors" aria-label="Fechar">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
              {tools.map((tool, index) => (
                <div key={index} className="border-b border-zinc-100 pb-6 last:border-0">
                  <h3 className="font-serif italic text-xl mb-2 text-zinc-900">{tool.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-4">{tool.description}</p>
                  <div className="bg-zinc-50 p-3 rounded border border-zinc-200 font-mono text-xs flex items-center gap-3">
                    <span className="text-zinc-400 uppercase font-bold">Lógica:</span>
                    <code className="text-emerald-700 font-bold">{tool.formula}</code>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-50 p-6 border-t border-zinc-100 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
