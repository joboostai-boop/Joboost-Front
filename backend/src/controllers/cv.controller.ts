import { Request, Response } from 'express';
import { prisma } from '../db';

export const cvController = {
  list: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      // Pagination optionnelle : sans paramètre, on renvoie tout (comportement d'origine)
      const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [cvs, total] = await Promise.all([
        (prisma as any).cV.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          ...(hasPagination ? { skip, take: limit } : {})
        }),
        (prisma as any).cV.count({ where: { userId: user.id } })
      ]);

      res.json({
        success: true,
        cvs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
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
