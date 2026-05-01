import { Router } from 'express';
import { geminiService } from '../services/gemini.service';

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

router.post('/generate-cover-letter', async (req, res) => {
    try {
        const { jobTitle, company, tone, profileContext, jobDescription } = req.body;
        const result = await geminiService.generateCoverLetter(jobTitle, company, tone, profileContext, jobDescription);
        res.json({ success: true, data: result });
    } catch (error: any) {
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
