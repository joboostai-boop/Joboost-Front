import { Request, Response } from 'express';
import { prisma } from '../db';

export const cvController = {
  list: async (req: Request, res: Response) => {
    try {
      // Pour le MVP on prend le seul user
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const cvs = await (prisma as any).cV.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ success: true, cvs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération CVs" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const { title, content, template } = req.body;
      const cv = await (prisma as any).cV.create({
        data: {
          title: title || "Nouveau CV",
          content: content || {},
          template: template || "Moderne",
          userId: user.id
        }
      });
      res.json({ success: true, cv });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur création CV" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await (prisma as any).cV.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.userId) {
        return res.status(404).json({ success: false, error: "CV introuvable" });
      }
      const { title, content, template } = req.body;
      const cv = await (prisma as any).cV.update({
        where: { id },
        data: { title, content, template }
      });
      res.json({ success: true, cv });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur mise à jour CV" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await (prisma as any).cV.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.userId) {
        return res.status(404).json({ success: false, error: "CV introuvable" });
      }
      await (prisma as any).cV.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur suppression CV" });
    }
  }
};
