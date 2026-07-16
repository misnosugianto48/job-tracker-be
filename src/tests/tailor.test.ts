import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

// Mock the GoogleGenAI SDK to avoid external API calls during testing
const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    ThinkingLevel: {
      OFF: "OFF",
      MEDIUM: "MEDIUM",
      FULL: "FULL",
    },
  };
});

describe("AI Resume Tailor & Cover Letter Builder Integration Tests", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/tailor", () => {
    const jobDescription = `
      Senior Node.js Developer wanted.
      Must have strong experience in TypeScript, NestJS, and PostgreSQL.
      AWS and Docker knowledge is highly preferred.
    `;

    const resumeText = `
      Software Engineer with 4 years of experience.
      Skilled in JavaScript, Node.js, Express, and SQL databases.
      Familiar with Docker and git.
    `;

    it("should successfully analyze resume and job description, returning keywords and cover letter", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          keySkills: ["Node.js", "Docker"],
          missingKeywords: ["TypeScript", "NestJS", "PostgreSQL", "AWS"],
          coverLetter: "Dear Hiring Manager, I am excited to apply for the Senior Node.js Developer position...",
        }),
      });

      const response = await request(app)
        .post("/api/ai/tailor")
        .send({ jobDescription, resumeText });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("keySkills");
      expect(response.body).toHaveProperty("missingKeywords");
      expect(response.body).toHaveProperty("coverLetter");
      expect(response.body.keySkills).toContain("Node.js");
      expect(response.body.missingKeywords).toContain("TypeScript");
      expect(response.body.coverLetter).toContain("Dear Hiring Manager");

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe("gemini-3.5-flash");
    });

    it("should return 400 Bad Request when jobDescription or resumeText is missing", async () => {
      const response = await request(app)
        .post("/api/ai/tailor")
        .send({ resumeText });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("jobDescription");
    });

    it("should return 400 Bad Request when resumeText is empty", async () => {
      const response = await request(app)
        .post("/api/ai/tailor")
        .send({ jobDescription, resumeText: "" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("resumeText");
    });

    it("should gracefully handle failures and fallback to another model", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Service Unavailable"))
        .mockResolvedValueOnce({
          text: JSON.stringify({
            keySkills: ["Node.js"],
            missingKeywords: ["NestJS"],
            coverLetter: "Hiring Manager, here is my tailored letter...",
          }),
        });

      const response = await request(app)
        .post("/api/ai/tailor")
        .send({ jobDescription, resumeText });

      expect(response.status).toBe(200);
      expect(response.body.coverLetter).toContain("Hiring Manager");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(mockGenerateContent.mock.calls[0][0].model).toBe("gemini-3.5-flash");
      expect(mockGenerateContent.mock.calls[1][0].model).toBe("gemini-3.1-flash-lite");
    });
  });
});
