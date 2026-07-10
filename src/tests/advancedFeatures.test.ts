import request from "supertest";
import app from "../app";
import { prisma, pool } from "../lib/prisma";

describe("Advanced Features Integration Tests (Salary, Export, Search)", () => {
  let testCompanyId1: number;
  let testCompanyId2: number;
  let testAppId1: number;
  let testAppId2: number;

  const companyName1 = `Alpha Corp ${Date.now()}`;
  const companyName2 = `Beta Tech ${Date.now()}`;

  afterAll(async () => {
    // Cleanup
    if (testCompanyId1) {
      await prisma.company.delete({ where: { id: testCompanyId1 } }).catch(() => {});
    }
    if (testCompanyId2) {
      await prisma.company.delete({ where: { id: testCompanyId2 } }).catch(() => {});
    }
    await prisma.$disconnect();
    await pool.end();
  });

  describe("Setup Dependency Data", () => {
    it("should create two companies and corresponding applications with expected salaries", async () => {
      // Create Company 1
      const comp1Response = await request(app)
        .post("/api/companies")
        .send({
          name: companyName1,
          industry: "Finance",
          location: "New York",
        });
      expect(comp1Response.status).toBe(201);
      testCompanyId1 = comp1Response.body.id;

      // Create Company 2
      const comp2Response = await request(app)
        .post("/api/companies")
        .send({
          name: companyName2,
          industry: "Healthcare",
          location: "San Francisco",
        });
      expect(comp2Response.status).toBe(201);
      testCompanyId2 = comp2Response.body.id;

      // Create Application 1 (Active)
      const app1Response = await request(app)
        .post("/api/applications")
        .send({
          companyId: testCompanyId1,
          jobTitle: "Senior Analyst",
          dateApplied: new Date().toISOString(),
          source: "LinkedIn",
          expectedSalary: 120000,
          stage: "INTERVIEW",
        });
      expect(app1Response.status).toBe(201);
      testAppId1 = app1Response.body.id;

      // Create Application 2 (Active)
      const app2Response = await request(app)
        .post("/api/applications")
        .send({
          companyId: testCompanyId2,
          jobTitle: "DevOps Engineer",
          dateApplied: new Date().toISOString(),
          source: "Indeed",
          expectedSalary: 160000,
          stage: "APPLIED",
        });
      expect(app2Response.status).toBe(201);
      testAppId2 = app2Response.body.id;
    });
  });

  describe("6.4 Salary Analytics & Insights", () => {
    it("should return correct salary statistics on dashboard endpoint", async () => {
      const response = await request(app).get("/api/dashboard");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("salaryAnalytics");
      
      const stats = response.body.salaryAnalytics;
      expect(stats.min).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
      expect(stats.average).toBeGreaterThanOrEqual(stats.min);
      expect(stats.average).toBeLessThanOrEqual(stats.max);
      expect(stats.totalPipelineValue).toBeGreaterThanOrEqual(280000);
    });
  });

  describe("6.5 Backup & Data Export", () => {
    it("should export database data to JSON by default", async () => {
      const response = await request(app).get("/api/export");
      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toContain("application/json");
      expect(response.body).toHaveProperty("companies");
      expect(response.body).toHaveProperty("applications");
      
      const companyExists = response.body.companies.some((c: { id: number }) => c.id === testCompanyId1);
      const appExists = response.body.applications.some((a: { id: number }) => a.id === testAppId1);
      expect(companyExists).toBe(true);
      expect(appExists).toBe(true);
    });

    it("should export database data to CSV format when requested", async () => {
      const response = await request(app).get("/api/export?format=csv");
      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toContain("text/csv");
      expect(response.text).toContain("ID,Company Name,Job Title");
      expect(response.text).toContain(companyName1);
      expect(response.text).toContain("Senior Analyst");
    });
  });

  describe("6.1 Search & Pipeline Filtering", () => {
    it("should filter applications by job title search term", async () => {
      const response = await request(app).get("/api/applications?search=DevOps");
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].jobTitle).toBe("DevOps Engineer");
    });

    it("should filter applications by company name search term", async () => {
      const response = await request(app).get(`/api/applications?search=Alpha`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].company.name).toBe(companyName1);
    });

    it("should filter companies by name search term", async () => {
      const response = await request(app).get(`/api/companies?search=Beta`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(companyName2);
    });
  });
});
