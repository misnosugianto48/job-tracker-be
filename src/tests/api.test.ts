import request from "supertest";
import app from "../app";
import { prisma, pool } from "../lib/prisma";

describe("Job Search CMS API Integration Tests", () => {
  // Ensure the database connection is closed after tests finish running
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  describe("GET /", () => {
    it("should return 200 OK with welcome message", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Job Tracker API is running!");
    });
  });

  describe("GET /api/companies", () => {
    it("should return 200 OK with list of companies", async () => {
      const response = await request(app).get("/api/companies");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Company Lifecycle Integration Test", () => {
    let testCompanyId: number;
    const uniqueName = `Test Company ${Date.now()}`;

    it("should create a new company successfully", async () => {
      const response = await request(app)
        .post("/api/companies")
        .send({
          name: uniqueName,
          industry: "Testing",
          location: "Virtual",
          url: "https://testcompany.example.com",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(uniqueName);
      testCompanyId = response.body.id;
    });

    it("should prevent duplicate company names", async () => {
      const response = await request(app)
        .post("/api/companies")
        .send({
          name: uniqueName,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should delete the created company successfully", async () => {
      if (!testCompanyId) {
        throw new Error("testCompanyId is undefined. Create test must have failed.");
      }

      const response = await request(app).delete(`/api/companies/${testCompanyId}`);
      expect([200, 204]).toContain(response.status);
    });
  });
});
