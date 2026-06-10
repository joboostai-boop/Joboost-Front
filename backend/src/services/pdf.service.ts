import PDFDocument from 'pdfkit';

// ====================================================================
//  Génération PDF côté serveur (pure JS, pas de navigateur headless).
//  Sert à produire les pièces jointes des candidatures spontanées :
//   - la lettre de motivation,
//   - un CV synthétique à partir du profil utilisateur.
// ====================================================================

const VIOLET = '#7D5CFF';
const DARK = '#111827';
const GRAY = '#6B7280';

// Concatène le flux PDFKit en un Buffer.
const toBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

const asArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

export const pdfService = {
  /** Lettre de motivation en PDF (sobre, A4). */
  coverLetterPdf: async (text: string, senderName?: string): Promise<Buffer> => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 64, right: 64 } });
    doc.font('Helvetica').fontSize(11).fillColor(DARK);
    if (senderName) {
      doc.font('Helvetica-Bold').fontSize(13).text(senderName);
      doc.moveDown(1.5);
    }
    doc.font('Helvetica').fontSize(11).fillColor(DARK);
    for (const para of text.split(/\n{2,}/)) {
      doc.text(para.trim(), { align: 'left', lineGap: 3 });
      doc.moveDown(0.8);
    }
    return toBuffer(doc);
  },

  /** CV synthétique à partir des champs du profil utilisateur. */
  cvPdf: async (user: any): Promise<Buffer> => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Candidat';

    // En-tête
    doc.font('Helvetica-Bold').fontSize(22).fillColor(DARK).text(fullName);
    if (user.title) doc.font('Helvetica').fontSize(13).fillColor(VIOLET).text(user.title);
    const contact = [user.email, user.phone, user.city].filter(Boolean).join('  •  ');
    if (contact) doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(contact);
    doc.moveDown(0.6);
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - 56, doc.y).stroke();
    doc.moveDown(0.8);

    const section = (title: string) => {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(VIOLET).text(title.toUpperCase(), { characterSpacing: 1 });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor(DARK);
    };

    if (user.summary) {
      section('Profil');
      doc.text(String(user.summary), { lineGap: 2 });
    }

    const experiences = asArray(user.experiences);
    if (experiences.length) {
      section('Expériences');
      for (const e of experiences) {
        const head = [e.role || e.title, e.company].filter(Boolean).join(' — ');
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK).text(head || 'Expérience', { continued: !!e.period });
        if (e.period) doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(`   ${e.period}`);
        if (e.desc || e.description) doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text(String(e.desc || e.description), { lineGap: 1.5 });
        doc.moveDown(0.4);
      }
    }

    const education = asArray(user.education);
    if (education.length) {
      section('Formation');
      for (const ed of education) {
        const head = [ed.degree || ed.title, ed.school || ed.institution].filter(Boolean).join(' — ');
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK).text(head || 'Formation', { continued: !!ed.period });
        if (ed.period) doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(`   ${ed.period}`);
        doc.moveDown(0.3);
      }
    }

    const skills = asArray(user.skills);
    if (skills.length) {
      section('Compétences');
      doc.font('Helvetica').fontSize(10).fillColor(DARK).text(skills.join('  •  '), { lineGap: 2 });
    }

    const languages = asArray(user.languages);
    if (languages.length) {
      section('Langues');
      doc.font('Helvetica').fontSize(10).fillColor(DARK).text(languages.join('  •  '));
    }

    return toBuffer(doc);
  },
};
