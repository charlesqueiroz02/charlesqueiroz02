import { useState } from 'react';
import { report } from '../data/actions';
import { REPORT_REASONS } from '../data/catalog';
import type { ReportTarget } from '../types';
import { Button, Chip, Field, Modal, inputCls, useAction } from './ui';

export function ReportModal({ target, onClose }: { target: { type: ReportTarget; id: string } | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const { busy, run } = useAction();
  return (
    <Modal open={!!target} onClose={onClose} title="Denunciar">
      <p className="mb-3 text-sm text-muted">Sua denúncia é anônima para a outra parte e será analisada pela moderação.</p>
      <div className="flex flex-wrap gap-2">
        {REPORT_REASONS.map((r) => (
          <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        <Field label="Detalhes (opcional)">
          <textarea className={inputCls} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
      </div>
      <Button
        className="mt-4 w-full"
        variant="dark"
        loading={busy}
        onClick={async () => {
          const ok = await run(() => {
            report(target!.type, target!.id, reason, details);
            return true;
          }, 'Denúncia enviada. Obrigado por ajudar a comunidade.');
          if (ok) {
            setReason('');
            setDetails('');
            onClose();
          }
        }}
      >
        Enviar denúncia
      </Button>
    </Modal>
  );
}
