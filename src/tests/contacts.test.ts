import request from "supertest";
import app from "../app";
import { prisma, pool } from "../lib/prisma";

describe("Contacts CRM Integration Tests", () => {
  let testCompanyId: number;
  let testContactId: number;

  const companyName = `Test Company for Contacts ${Date.now()}`;

  afterAll(async () => {
    if (testCompanyId) {
      await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
    }
    await prisma.$disconnect();
    await pool.end();
  });

  describe("Setup Dependency Data", () => {
    it("should create a company", async () => {
      const response = await request(app)
        .post("/api/companies")
        .send({
          name: companyName,
          industry: "Services",
          location: "Jakarta",
        });
      expect(response.status).toBe(201);
      testCompanyId = response.body.id;
    });
  });

  describe("Contacts CRUD API", () => {
    it("should create a contact for the company", async () => {
      const response = await request(app)
        .post(`/api/companies/${testCompanyId}/contacts`)
        .send({
          name: "John Doe",
          role: "Technical Recruiter",
          email: "johndoe@recruiter.com",
          phone: "+62812345678",
          linkedInUrl: "https://linkedin.com/in/johndoe",
          notes: "Spoke on LinkedIn about SWE role",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("John Doe");
      expect(response.body.role).toBe("Technical Recruiter");
      expect(response.body.email).toBe("johndoe@recruiter.com");
      expect(response.body.companyId).toBe(testCompanyId);

      testContactId = response.body.id;
    });

    it("should reject contact creation with missing name", async () => {
      const response = await request(app)
        .post(`/api/companies/${testCompanyId}/contacts`)
        .send({
          role: "HR",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject contact creation with invalid email formatting", async () => {
      const response = await request(app)
        .post(`/api/companies/${testCompanyId}/contacts`)
        .send({
          name: "Jane Doe",
          email: "not-an-email",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should list all contacts for the company", async () => {
      const response = await request(app).get(`/api/companies/${testCompanyId}/contacts`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe("John Doe");
    });

    it("should update contact details successfully", async () => {
      const response = await request(app)
        .patch(`/api/contacts/${testContactId}`)
        .send({
          role: "Lead recruiter",
          notes: "Offered to refer me directly",
        });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("Lead recruiter");
      expect(response.body.notes).toBe("Offered to refer me directly");
    });

    it("should delete the contact successfully", async () => {
      const deleteResponse = await request(app).delete(`/api/contacts/${testContactId}`);
      expect([200, 204]).toContain(deleteResponse.status);

      const listResponse = await request(app).get(`/api/companies/${testCompanyId}/contacts`);
      expect(listResponse.body.length).toBe(0);
    });
  });
});
