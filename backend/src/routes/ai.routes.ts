import { Router } from 'express';
import { geminiService } from '../services/gemini.service';
import { usageService } from '../services/usage.service';

const router = Router();

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
