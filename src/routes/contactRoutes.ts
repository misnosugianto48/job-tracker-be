import { Router } from "express";
import {
  createContact,
  getContactsByCompany,
  updateContact,
  deleteContact,
} from "../controllers/contactController";

const router = Router();

router.post("/companies/:companyId/contacts", createContact);
router.get("/companies/:companyId/contacts", getContactsByCompany);
router.patch("/contacts/:id", updateContact);
router.put("/contacts/:id", updateContact);
router.delete("/contacts/:id", deleteContact);

export default router;
