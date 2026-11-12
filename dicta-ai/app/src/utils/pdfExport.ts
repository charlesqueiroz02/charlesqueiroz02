import { saveOrShareFile } from '../lib/native';

interface PDFExportOptions {
  refinedText: string;
  rawText?: string;
  mode?: string;
  detectedLanguage?: string;
  fillerWordsRemoved?: string[];
}

/**
 * Exporta o texto refinado como PDF estruturado.
 * O jsPDF (~350 KB) é carregado só aqui, na primeira exportação, para não
 * pesar na abertura do app.
 */
export async function exportDocumentToPDF({
  refinedText,
  rawText = '',
  mode = 'documento',
  detectedLanguage = 'Português',
  fillerWordsRemoved = [],
}: PDFExportOptions) {
  if (!refinedText || !refinedText.trim()) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(20, 18, 33);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DICTA AI', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 180, 225);
  doc.text('Documento Estruturado por Voz & Inteligência Artificial', margin, 20);

  // Metadata (Right side of banner)
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(210, 210, 230);
  doc.text(dateStr, pageWidth - margin, 13, { align: 'right' });
  doc.text(`Formato: ${mode.toUpperCase()}  |  ${detectedLanguage}`, pageWidth - margin, 20, { align: 'right' });

  let y = 38;

  // Metadata Summary Box
  doc.setFillColor(248, 249, 253);
  doc.setDrawColor(222, 225, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  const words = refinedText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 130));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 45, 75);
  doc.text(`Total de Palavras: ${words}`, margin + 5, y + 6.5);
  doc.text(`Tempo de Leitura: ~${readingTime} min`, margin + 55, y + 6.5);
  doc.text(`Vícios Eliminados: ${fillerWordsRemoved.length}`, margin + 115, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 130);
  if (fillerWordsRemoved.length > 0) {
    const fillersSample = fillerWordsRemoved.slice(0, 5).join(', ') + (fillerWordsRemoved.length > 5 ? '...' : '');
    doc.text(`Filtro acústico: removidas hesitações como "${fillersSample}"`, margin + 5, y + 12.5);
  } else {
    doc.text('Fala fluida e natural processada sem hesitações detectadas.', margin + 5, y + 12.5);
  }

  y += 28;

  // Section Header: Texto Refinado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 45);
  doc.text('Texto Refinado', margin, y);

  // Purple accent line
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 35, y + 2);

  y += 9;

  // Refined Body Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(35, 35, 45);

  const paragraphs = refinedText.split(/\n+/);
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    const splitLines = doc.splitTextToSize(para.trim(), contentWidth);
    for (const line of splitLines) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5.2;
    }
    y += 2.5; // paragraph spacing
  }

  y += 6;

  // Section: Fala Original Capturada (se disponível e diferente)
  if (rawText && rawText.trim() && rawText.trim() !== refinedText.trim()) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 110, 140);
    doc.text('Transcrição Literal (Áudio Bruto):', margin, y);

    y += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 140);

    const splitRaw = doc.splitTextToSize(`"${rawText.trim()}"`, contentWidth);
    for (const line of splitRaw) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 4.2;
    }
  }

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 165);
    doc.setDrawColor(225, 225, 235);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text('Gerado por Dicta AI Voice Keyboard • Digitação e ditado por voz inteligente', margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Trigger download
  const cleanMode = mode.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `dicta-${cleanMode}-${Date.now()}.pdf`;
  await saveOrShareFile(doc.output('blob'), filename);
}
