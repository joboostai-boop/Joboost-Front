import { Request, Response } from 'express';
import { prisma } from '../db';



export const applicationController = {
  create: async (req: Request, res: Response, next: any) => {
    try {
      console.log("🟢 [DEBUG] Entrée dans POST /api/applications");
      console.log("🟢 [DEBUG] req.body reçu :", req.body);

      const userId = req.userId!;
      if (!userId) {
        return res.status(403).json({ success: false, error: "Non authentifié." });
      }

      const body = req.body || {};
      const { company, title, source, status, appliedAt, notes } = body;
      
      if (!company || !title) {
        return res.status(400).json({ success: false, error: "Les champs 'company' et 'title' sont obligatoires." });
      }

      console.log("🟢 [DEBUG] Validation OK. Tentative prisma.application.create ...");

      const newApp = await prisma.application.create({
        data: {
          company: String(company),
          title: String(title),
          source: source ? String(source) : "Candidature spontanée",
          status: status || "PENDING",
          appliedAt: appliedAt ? new Date(appliedAt) : new Date(),
          notes: notes ? String(notes) : null,
          userId: userId
        }
      });

      console.log("🟢 [DEBUG] prisma.application.create RÉUSSI ! Envoi de la réponse JSON 201...");
      return res.status(201).json({ success: true, data: newApp });
    } catch (error: any) {
      console.error("🔴 [DEBUG] Erreur catchée dans create:", error);
      return next(error);
    }
  },

  list: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(403).json({ success: false, error: "Non authentifié." });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where: { userId },
          orderBy: { appliedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.application.count({ where: { userId } })
      ]);

      res.json({ 
        success: true, 
        data: applications,
        meta: {
          total,
          page,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error("Application List Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des candidatures." });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      if (!userId) return res.status(403).json({ success: false, error: "Non autorisé" });
      
      const paramId = req.params.id;

      // Ensure ownership
      const existing = await prisma.application.findUnique({ where: { id: paramId } });
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, error: "Candidature introuvable." });
      }

      const { company, title, source, status, notes } = req.body;
      const updated = await prisma.application.update({
        where: { id: paramId },
        data: { company, title, source, status, notes }
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error("Application Update Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur lors de la mise à jour." });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      if (!userId) return res.status(403).json({ success: false, error: "Non autorisé" });
      
      const paramId = req.params.id;

      const existing = await prisma.application.findUnique({ where: { id: paramId } });
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, error: "Candidature introuvable." });
      }

      await prisma.application.delete({ where: { id: paramId } });

      res.json({ success: true, data: null });
    } catch (error: any) {
      console.error("Application Delete Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur lors de la suppression." });
    }
  }
};
