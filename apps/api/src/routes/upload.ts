import { Router } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../services/cloudinary.service";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", requireAuth, requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const folder = req.body.folder || "mart_products";
    const imageUrl = await uploadToCloudinary(req.file.buffer, folder);
    res.json({ imageUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
