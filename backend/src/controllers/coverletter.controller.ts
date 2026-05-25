import { Request, Response } from 'express';
import { prisma } from '../db';

export const coverLetterController = {
  list: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [letters, total] = await Promise.all([
        (prisma as any).coverLetter.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        (prisma as any).coverLetter.count({ where: { userId: user.id } })
      ]);

      res.json({
        success: true,
        letters,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération Lettres" });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const { title, company, jobTitle, content } = req.body;
      const letter = await (prisma as any).coverLetter.create({
        data: {
          title: title || "Nouvelle Lettre",
          company: company || "",
          jobTitle: jobTitle || "",
          content: content || "",
          userId: user.id
        }
      });
      res.json({ success: true, letter });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur création Lettre" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await (prisma as any).coverLetter.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.userId) {
        return res.status(404).json({ success: false, error: "Lettre introuvable" });
      }
      const { title, company, jobTitle, content } = req.body;
      const letter = await (prisma as any).coverLetter.update({
        where: { id },
        data: { title, company, jobTitle, content }
      });
      res.json({ success: true, letter });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur mise à jour Lettre" });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await (prisma as any).coverLetter.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.userId) {
        return res.status(404).json({ success: false, error: "Lettre introuvable" });
      }
      await (prisma as any).coverLetter.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur suppression Lettre" });
    }
  }
};
