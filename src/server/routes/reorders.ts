import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  const { getReorderList } = require("../data/reorderList");
  res.json(getReorderList());
});

export default router;
