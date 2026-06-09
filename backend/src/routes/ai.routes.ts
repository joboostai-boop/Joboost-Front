import { Router } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { geminiService } from '../services/gemini.service';
import { usageService } from '../services/usage.service';

// pdf-parse n'a pas de types officiels → require pour éviter l'erreur de déclaration.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

const router = Router();

// Upload en mémoire, 5 Mo max (cohérent avec la limite côté frontend).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Extrait le texte brut d'un CV uploadé (PDF ou DOCX).
const extractCvText = async (file: Express.Multer.File): Promise<string> => {
  const name = (file.originalname || '').toLowerCase();
  const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
  const isDocx =
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx');

  if (isPdf) {
    const data = await pdfParse(file.buffer);
    return data.text || '';
  }
  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || '';
  }
  throw new Error('Format non supporté. Utilise un PDF ou un DOCX.');
};

// Analyse un CV uploadé et renvoie un profil structuré (réel, via extraction texte + IA).
router.post('/parse-cv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier reçu.' });
    }
    const text = await extractCvText(req.file);
    if (!text || text.trim().length < 30) {
      return res.status(422).json({
        success: false,
        error: "On n'a pas réussi à lire ce CV. Réessaie avec un autre fichier ou saisis tes infos à la main.",
      });
    }
    const data = await geminiService.parseCv(text);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Erreur lors de l'analyse du CV." });
  }
});

router.post('/optimize-profile', async (req, res) => {
    try {
        const result = await geminiService.getProfileOptimizations(req.body.profileData);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/parse-linkedin', async (req, res) => {
    try {
        const result = await geminiService.parseLinkedInProfile(req.body.profileText);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/rewrite-section', async (req, res) => {
    try {
        const { sectionName, currentText, context } = req.body;
        const result = await geminiService.rewriteSection(sectionName, currentText, context);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/generate-cv-summary', async (req, res) => {
    try {
        const { title, skills, experiences } = req.body;
        const result = await geminiService.generateCVSummary(title, skills, experiences);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// La lettre de motivation = 1 "candidature IA" (action facturée). On débite
// quota mensuel → crédits, sinon 402. Remboursement si la génération échoue.
router.post('/generate-cover-letter', async (req, res) => {
    const userId = req.userId!;

    const consumption = await usageService.consumeCandidature(userId);
    if (!consumption.allowed) {
        return res.status(402).json({
            success: false,
            code: 'QUOTA_EXCEEDED',
            error: "Vous avez atteint votre limite de candidatures ce mois-ci. Passez à l'abonnement Élite ou ajoutez un pack de crédits.",
        });
    }

    try {
        const { jobTitle, company, tone, profileContext, jobDescription } = req.body;
        const result = await geminiService.generateCoverLetter(jobTitle, company, tone, profileContext, jobDescription);
        res.json({
            success: true,
            data: result,
            usage: {
                source: consumption.source,
                remainingQuota: consumption.remainingQuota,
                credits: consumption.credits,
            },
        });
    } catch (error: any) {
        // La génération a échoué après débit → on rembourse pour ne pas léser l'utilisateur.
        if (consumption.source) await usageService.refundCandidature(userId, consumption.source);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/generate-bulk-message', async (req, res) => {
    try {
        const { candidateName, candidateTitle, companyName, companySector } = req.body;
        const result = await geminiService.generateBulkMessage(candidateName, candidateTitle, companyName, companySector);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
