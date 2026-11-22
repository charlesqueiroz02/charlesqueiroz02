import { useState } from 'react';
import { useStore } from '../data/store';
import { Button, Chip, Field, Modal, inputCls } from './ui';

export function AreaPicker({ open, onClose, city, neighborhood, onSave }: { open: boolean; onClose: () => void; city: string; neighborhood: string; onSave: (a: { city: string; neighborhood: string }) => void }) {
  const { db } = useStore();
  const [c, setC] = useState(city);
  const [n, setN] = useState(neighborhood);
  const region = db.regions.find((r) => r.city === c);
  return (
    <Modal open={open} onClose={onClose} title="Onde você precisa do serviço?">
      <p className="mb-4 text-sm text-muted">Usamos só o bairro para mostrar profissionais próximos. Não acessamos sua localização precisa.</p>
      <div className="space-y-4">
        <Field label="Cidade">
          <select className={inputCls} value={c} onChange={(e) => setC(e.target.value)}>
            {db.regions.map((r) => (
              <option key={r.city}>{r.city}</option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">Bairro</p>
          <div className="flex flex-wrap gap-2">
            {region?.neighborhoods.map((h) => (
              <Chip key={h} active={n === h} onClick={() => setN(h)}>
                {h}
              </Chip>
            ))}
          </div>
        </div>
        <Button
          className="w-full"
          disabled={!n}
          onClick={() => {
            onSave({ city: c, neighborhood: n });
            onClose();
          }}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  );
}
