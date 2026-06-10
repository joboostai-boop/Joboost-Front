// ====================================================================
//  Export ATS — CV et Lettres de motivation
//  Génère des documents en TEXTE RÉEL (sélectionnable) lisibles par les
//  robots ATS, au format PDF (@react-pdf/renderer) et Word (.docx).
//  Une seule colonne, polices standard, titres de sections classiques.
// ====================================================================
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx';

export interface CvExperience { role?: string; company?: string; period?: string; desc?: string; }
export interface CvEducation { school?: string; degree?: string; period?: string; desc?: string; }
export interface CvData {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  city?: string;
  summary?: string;
  skills?: string[];
  experiences?: CvExperience[];
  education?: CvEducation[];
  template?: string;
}

export interface LetterData {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  company?: string;
  jobTitle?: string;
  body: string;
  template?: string;
}

// Thème (couleur d'accent + police) de chaque modèle, aligné sur les galeries
// CV (cvTemplates.tsx) et Lettre (letterTemplates.tsx). L'export reste TOUJOURS
// en une seule colonne (100% ATS, texte réel sélectionnable) ; seuls la couleur
// d'accent et le choix serif / sans-serif varient selon le modèle sélectionné.
const TEMPLATE_THEME: Record<string, { accent: string; serif?: boolean }> = {
  // Modèles de CV
  lustre: { accent: '#334155', serif: true },
  quill: { accent: '#4F46E5', serif: true },
  vertex: { accent: '#4F46E5' },
  cobalt: { accent: '#2563EB' },
  bare: { accent: '#111827' },
  aero: { accent: '#059669' },
  nimbus: { accent: '#4F46E5' },
  onyx: { accent: '#0F172A' },
  crest: { accent: '#7C3AED' },
  mosaic: { accent: '#E11D48' },
  // Modèles de lettres
  sobre: { accent: '#334155', serif: true },
  classique: { accent: '#4F46E5', serif: true },
  moderne: { accent: '#4F46E5' },
  azur: { accent: '#2563EB' },
  epuree: { accent: '#111827' },
  net: { accent: '#059669' },
  bandeau: { accent: '#7C3AED' },
  ardoise: { accent: '#0F172A' },
  colonne: { accent: '#4F46E5' },
  corail: { accent: '#E11D48' },
};

// Polices STANDARD intégrées à react-pdf (sûres pour l'ATS, aucune police custom).
const styleFor = (template?: string) => {
  const th = TEMPLATE_THEME[template || ''] || { accent: '#4F46E5' };
  return th.serif
    ? { font: 'Times-Roman', fontBold: 'Times-Bold', accent: th.accent }
    : { font: 'Helvetica', fontBold: 'Helvetica-Bold', accent: th.accent };
};

// Couleur d'accent au format docx (hex sans '#').
const docxAccent = (template?: string) => styleFor(template).accent.replace('#', '');

const contactLine = (d: { email?: string; phone?: string; city?: string }) =>
  [d.email, d.phone, d.city].filter(Boolean).join('  •  ');

// ---------- Téléchargement d'un Blob ----------
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safe = (s?: string) => (s || '').trim();
const fileSafe = (s?: string) => (s || 'document').replace(/\s+/g, '_').replace(/[^\w\-]/g, '');

// ==================== CV — PDF (texte réel) ====================
const CvPdfDoc: React.FC<{ data: CvData }> = ({ data }) => {
  const t = styleFor(data.template);
  const s = StyleSheet.create({
    page: { paddingVertical: 40, paddingHorizontal: 48, fontFamily: t.font, fontSize: 10, color: '#1A1A1A', lineHeight: 1.4 },
    name: { fontFamily: t.fontBold, fontSize: 20, color: t.accent, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.2 },
    title: { fontFamily: t.fontBold, fontSize: 12, color: '#333333', marginTop: 5 },
    contact: { fontSize: 9, color: '#555555', marginTop: 4 },
    sectionTitle: { fontFamily: t.fontBold, fontSize: 11, color: t.accent, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#DDDDDD', paddingBottom: 2 },
    paragraph: { fontSize: 10, color: '#222222', marginBottom: 2 },
    expRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    expRole: { fontFamily: t.fontBold, fontSize: 10.5 },
    expPeriod: { fontSize: 9, color: '#666666' },
    expCompany: { fontFamily: t.fontBold, fontSize: 10, color: t.accent, marginBottom: 1 },
    skills: { fontSize: 10, color: '#222222' },
  });

  const exps = (data.experiences || []).filter((e) => e && (e.role || e.company || e.desc));
  const edu = (data.education || []).filter((e) => e && (e.school || e.degree));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{safe(data.name) || 'Nom Prénom'}</Text>
        {!!safe(data.title) && <Text style={s.title}>{data.title}</Text>}
        {!!contactLine(data) && <Text style={s.contact}>{contactLine(data)}</Text>}

        {!!safe(data.summary) && (
          <View>
            <Text style={s.sectionTitle}>Profil</Text>
            <Text style={s.paragraph}>{data.summary}</Text>
          </View>
        )}

        {(data.skills || []).length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Compétences</Text>
            <Text style={s.skills}>{(data.skills || []).join('  •  ')}</Text>
          </View>
        )}

        {exps.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Expérience professionnelle</Text>
            {exps.map((e, i) => (
              <View key={i} wrap={false}>
                <View style={s.expRow}>
                  <Text style={s.expRole}>{safe(e.role) || 'Poste'}</Text>
                  {!!safe(e.period) && <Text style={s.expPeriod}>{e.period}</Text>}
                </View>
                {!!safe(e.company) && <Text style={s.expCompany}>{e.company}</Text>}
                {!!safe(e.desc) && <Text style={s.paragraph}>{e.desc}</Text>}
              </View>
            ))}
          </View>
        )}

        {edu.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Formation</Text>
            {edu.map((e, i) => (
              <View key={i} wrap={false}>
                <View style={s.expRow}>
                  <Text style={s.expRole}>{safe(e.degree) || safe(e.school)}</Text>
                  {!!safe(e.period) && <Text style={s.expPeriod}>{e.period}</Text>}
                </View>
                {!!safe(e.school) && !!safe(e.degree) && <Text style={s.expCompany}>{e.school}</Text>}
                {!!safe(e.desc) && <Text style={s.paragraph}>{e.desc}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export const exportCvPdf = async (data: CvData) => {
  const blob = await pdf(<CvPdfDoc data={data} />).toBlob();
  downloadBlob(blob, `CV_${fileSafe(data.name)}.pdf`);
};

// ==================== CV — DOCX (Word, idéal ATS) ====================
const docHeading = (text: string, accent = '333333') =>
  new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { color: 'CCCCCC', size: 6, style: 'single', space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: accent })],
  });

export const exportCvDocx = async (data: CvData) => {
  const children: Paragraph[] = [];
  const accent = docxAccent(data.template);

  children.push(new Paragraph({ children: [new TextRun({ text: safe(data.name) || 'Nom Prénom', bold: true, size: 36, color: accent })] }));
  if (safe(data.title)) children.push(new Paragraph({ children: [new TextRun({ text: data.title, bold: true, size: 24, color: '444444' })] }));
  if (contactLine(data)) children.push(new Paragraph({ children: [new TextRun({ text: contactLine(data), size: 18, color: '555555' })] }));

  if (safe(data.summary)) {
    children.push(docHeading('Profil', accent));
    children.push(new Paragraph({ children: [new TextRun({ text: data.summary!, size: 20 })] }));
  }

  if ((data.skills || []).length > 0) {
    children.push(docHeading('Compétences', accent));
    children.push(new Paragraph({ children: [new TextRun({ text: (data.skills || []).join('  •  '), size: 20 })] }));
  }

  const exps = (data.experiences || []).filter((e) => e && (e.role || e.company || e.desc));
  if (exps.length > 0) {
    children.push(docHeading('Expérience professionnelle', accent));
    exps.forEach((e) => {
      children.push(new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: safe(e.role) || 'Poste', bold: true, size: 21 }),
          ...(safe(e.period) ? [new TextRun({ text: `   —   ${e.period}`, size: 18, color: '666666' })] : []),
        ],
      }));
      if (safe(e.company)) children.push(new Paragraph({ children: [new TextRun({ text: e.company!, bold: true, italics: true, size: 20, color: '444444' })] }));
      if (safe(e.desc)) children.push(new Paragraph({ children: [new TextRun({ text: e.desc!, size: 20 })] }));
    });
  }

  const edu = (data.education || []).filter((e) => e && (e.school || e.degree));
  if (edu.length > 0) {
    children.push(docHeading('Formation', accent));
    edu.forEach((e) => {
      children.push(new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: safe(e.degree) || safe(e.school), bold: true, size: 21 }),
          ...(safe(e.period) ? [new TextRun({ text: `   —   ${e.period}`, size: 18, color: '666666' })] : []),
        ],
      }));
      if (safe(e.school) && safe(e.degree)) children.push(new Paragraph({ children: [new TextRun({ text: e.school!, italics: true, size: 20, color: '444444' })] }));
      if (safe(e.desc)) children.push(new Paragraph({ children: [new TextRun({ text: e.desc!, size: 20 })] }));
    });
  }

  const doc = new DocxDocument({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `CV_${fileSafe(data.name)}.docx`);
};

// ==================== Lettre — PDF (texte réel) ====================
const LetterPdfDoc: React.FC<{ data: LetterData }> = ({ data }) => {
  const t = styleFor(data.template);
  const s = StyleSheet.create({
    page: { paddingVertical: 56, paddingHorizontal: 56, fontFamily: t.font, fontSize: 11, color: '#1A1A1A', lineHeight: 1.5 },
    name: { fontFamily: t.fontBold, fontSize: 13 },
    small: { fontSize: 10, color: '#555555' },
    block: { marginBottom: 20 },
    company: { fontFamily: t.fontBold, fontSize: 12, marginTop: 4 },
    object: { fontFamily: t.fontBold, fontSize: 11.5, marginBottom: 16 },
    body: { fontSize: 11, textAlign: 'justify' },
    sign: { marginTop: 28 },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.block}>
          <Text style={s.name}>{safe(data.name) || 'Votre Nom'}</Text>
          {!!contactLine(data) && <Text style={s.small}>{contactLine(data)}</Text>}
        </View>
        <View style={s.block}>
          <Text style={s.company}>{safe(data.company) || "L'entreprise"}</Text>
          <Text style={s.small}>À l'attention du Responsable Recrutement</Text>
        </View>
        {!!safe(data.jobTitle) && <Text style={s.object}>Objet : Candidature au poste de {data.jobTitle}</Text>}
        <Text style={s.body}>{safe(data.body)}</Text>
        <View style={s.sign}>
          <Text>Cordialement,</Text>
          <Text style={s.name}>{safe(data.name) || 'Votre Nom'}</Text>
        </View>
      </Page>
    </Document>
  );
};

export const exportLetterPdf = async (data: LetterData) => {
  const blob = await pdf(<LetterPdfDoc data={data} />).toBlob();
  downloadBlob(blob, `Lettre_${fileSafe(data.name)}_${fileSafe(data.company)}.pdf`);
};

// ==================== Lettre — DOCX ====================
export const exportLetterDocx = async (data: LetterData) => {
  const children: Paragraph[] = [];
  const accent = docxAccent(data.template);
  children.push(new Paragraph({ children: [new TextRun({ text: safe(data.name) || 'Votre Nom', bold: true, size: 24, color: accent })] }));
  if (contactLine(data)) children.push(new Paragraph({ children: [new TextRun({ text: contactLine(data), size: 18, color: '555555' })] }));
  children.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: safe(data.company) || "L'entreprise", bold: true, size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: "À l'attention du Responsable Recrutement", size: 18, color: '555555' })] }));
  if (safe(data.jobTitle)) {
    children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: `Objet : Candidature au poste de ${data.jobTitle}`, bold: true, size: 22 })] }));
  }
  // Corps : un paragraphe par ligne non vide pour préserver la structure.
  safe(data.body).split(/\n+/).forEach((para) => {
    children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [new TextRun({ text: para, size: 22 })] }));
  });
  children.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: 'Cordialement,', size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: safe(data.name) || 'Votre Nom', bold: true, size: 22 })] }));

  const doc = new DocxDocument({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Lettre_${fileSafe(data.name)}_${fileSafe(data.company)}.docx`);
};
