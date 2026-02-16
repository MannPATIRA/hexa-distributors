import { Router } from "express";
import { getSuppliers } from "../data/suppliers";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getSuppliers());
});

router.get("/:id", (req, res) => {
  const supplier = getSuppliers().find((s) => s.id === req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  res.json(supplier);
});

export default router;
