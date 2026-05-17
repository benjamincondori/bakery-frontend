import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, XCircle, FileDown, Printer, Loader2 } from 'lucide-react';
import { invoicesService } from '@/services/index';
import PageHeader from '@/components/ui/PageHeader';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printInvoice } from '@/lib/invoicePdf';
import type { Invoice, InvoiceStatus } from '@/types';
import toast from '@/lib/toast';

const STATUS_VARIANTS: Record<InvoiceStatus, any> = {
  ACTIVE: 'success', CANCELLED: 'danger', PAID: 'info',
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  ACTIVE: 'Activa', CANCELLED: 'Anulada', PAID: 'Pagada',
};

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [cancelModal, setCancelModal] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, limit, search],
    queryFn: () => invoicesService.getAll({ page, limit, search }),
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => invoicesService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Factura anulada');
      setCancelModal(null); setCancelReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await invoicesService.downloadPdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo generar el PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = async (id: string) => {
    setPrintingId(id);
    try {
      const data = await invoicesService.getData(id);
      printInvoice(data);
    } catch {
      toast.error('No se pudo cargar la factura');
    } finally {
      setPrintingId(null);
    }
  };

  const columns = [
    { key: 'invoiceNumber', header: 'N° Factura', render: (i: Invoice) => <span className="font-mono text-sm font-semibold text-primary-600">{i.invoiceNumber}</span> },
    { key: 'customer', header: 'Cliente', render: (i: Invoice) => i.customer ? `${i.customer.firstName} ${i.customer.lastName}` : '—' },
    { key: 'total', header: 'Total', render: (i: Invoice) => <span className="font-bold">{formatCurrency(i.total)}</span> },
    { key: 'status', header: 'Estado', render: (i: Invoice) => (
      <Badge variant={STATUS_VARIANTS[i.status]}>{STATUS_LABELS[i.status]}</Badge>
    )},
    { key: 'issuedAt', header: 'Emisión', render: (i: Invoice) => formatDate(i.issuedAt) },
    { key: 'actions', header: '', render: (i: Invoice) => (
      <div className="flex items-center gap-2 justify-end">
        <button
          className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600 disabled:opacity-50"
          title="Descargar PDF"
          disabled={downloadingId === i.id}
          onClick={() => handleDownloadPdf(i)}
        >
          {downloadingId === i.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FileDown className="w-4 h-4" />}
        </button>
        <button
          className="btn-ghost p-1.5 text-stone-500 hover:text-primary-600 disabled:opacity-50"
          title="Imprimir"
          disabled={printingId === i.id}
          onClick={() => handlePrint(i.id)}
        >
          {printingId === i.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Printer className="w-4 h-4" />}
        </button>
        {i.status === 'ACTIVE' && (
          <button onClick={() => setCancelModal(i)} className="btn-ghost p-1.5 text-stone-500 hover:text-rose-600" title="Anular">
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Facturas" subtitle={`${data?.meta?.total ?? 0} facturas`} />

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Buscar por número..." />
        </div>
      </div>

      <Table columns={columns} data={data?.data ?? []} loading={isLoading} meta={data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} emptyMessage="No hay facturas" />

      {cancelModal && (
        <Modal isOpen={!!cancelModal} onClose={() => { setCancelModal(null); setCancelReason(''); }} title={`Anular factura ${cancelModal.invoiceNumber}`}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">Esta acción no se puede deshacer. La factura quedará marcada como anulada.</p>
            <div>
              <label className="label">Motivo de anulación *</label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input resize-none" rows={3} placeholder="Explique el motivo..." />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setCancelModal(null); setCancelReason(''); }}>Cancelar</button>
              <button
                className="btn-danger"
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ id: cancelModal.id, reason: cancelReason })}
              >
                {cancelMutation.isPending ? 'Anulando...' : 'Anular factura'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
