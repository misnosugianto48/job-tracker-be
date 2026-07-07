/**
 * 📚 LEARNER'S NOTE:
 * This integration test suite executes HTTP requests against our Express app endpoints.
 * It verifies full CRUD actions on todos, verifies that resumeVersion is successfully read and updated,
 * and validates that Zod validation works by asserting HTTP 400 responses on invalid payloads.
 */

import request from "supertest";
import app from "../app";
import { prisma, pool } from "../lib/prisma";

describe("Todos and Resume Version Integration Tests", () => {
  let testCompanyId: number;
  let testApplicationId: number;
  let testTodoId: number;

  const companyName = `Test Company for Todos ${Date.now()}`;

  // Clean up database after tests
  afterAll(async () => {
    if (testCompanyId) {
      try {
        await prisma.company.delete({ where: { id: testCompanyId } });
      } catch (err) {
        // Already deleted or not created
      }
    }
    await prisma.$disconnect();
    await pool.end();
  });

  describe("Setup Dependency Data", () => {
    it("should create a company and an application with resumeVersion", async () => {
      // 1. Create Company
      const compResponse = await request(app)
        .post("/api/companies")
        .send({
          name: companyName,
          industry: "Tech",
          location: "Remote",
        });
      expect(compResponse.status).toBe(201);
      testCompanyId = compResponse.body.id;

      // 2. Create Application with resumeVersion
      const appResponse = await request(app)
        .post("/api/applications")
        .send({
          companyId: testCompanyId,
          jobTitle: "Software Engineer",
          dateApplied: new Date().toISOString(),
          source: "LinkedIn",
          expectedSalary: 100000,
          stage: "APPLIED",
          resumeVersion: "v1.2-swe",
        });

      expect(appResponse.status).toBe(201);
      expect(appResponse.body).toHaveProperty("id");
      expect(appResponse.body.resumeVersion).toBe("v1.2-swe");
      testApplicationId = appResponse.body.id;
    });
  });

  describe("Resume Version Updates & Validation", () => {
    it("should allow updating resumeVersion", async () => {
      const updateResponse = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          resumeVersion: "v2.0-senior-swe",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.resumeVersion).toBe("v2.0-senior-swe");

      // Verify via GET
      const getResponse = await request(app).get(`/api/applications/${testApplicationId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.resumeVersion).toBe("v2.0-senior-swe");
    });

    it("should reject invalid inputs on application update using Zod validation", async () => {
      // e.g. jobTitle as empty string, or invalid expectedSalary
      const response = await request(app)
        .patch(`/api/applications/${testApplicationId}`)
        .send({
          jobTitle: "",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Todos API", () => {
    it("should create a todo for the application", async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/todos`)
        .send({
          title: "Prepare for coding challenge",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe("Prepare for coding challenge");
      expect(response.body.completed).toBe(false);
      expect(response.body.applicationId).toBe(testApplicationId);

      testTodoId = response.body.id;
    });

    it("should reject todo creation with invalid or empty title", async () => {
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/todos`)
        .send({
          title: "",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should list all todos for the application", async () => {
      const response = await request(app).get(`/api/applications/${testApplicationId}/todos`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].title).toBe("Prepare for coding challenge");
    });

    it("should update a todo (mark as completed)", async () => {
      const response = await request(app)
        .patch(`/api/todos/${testTodoId}`)
        .send({
          completed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
    });

    it("should update a todo title", async () => {
      const response = await request(app)
        .patch(`/api/todos/${testTodoId}`)
        .send({
          title: "Updated coding challenge prep",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Updated coding challenge prep");
    });

    it("should delete a todo", async () => {
      const deleteResponse = await request(app).delete(`/api/todos/${testTodoId}`);
      expect([200, 204]).toContain(deleteResponse.status);

      // Verify deletion
      const listResponse = await request(app).get(`/api/applications/${testApplicationId}/todos`);
      const found = listResponse.body.some((todo: any) => todo.id === testTodoId);
      expect(found).toBe(false);
    });
  });
});
