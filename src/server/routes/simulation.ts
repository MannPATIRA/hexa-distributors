import { Router } from "express";
import { store } from "../store";
import { triggerManualSimulation } from "../services/simulation";

const router = Router();

router.post("/trigger/:rfqId", (req, res) => {
  try {
    triggerManualSimulation(req.params.rfqId);
    res.json({ message: "Simulation triggered" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/status", (_req, res) => {
  res.json(store.simulationTasks);
});

export default router;
