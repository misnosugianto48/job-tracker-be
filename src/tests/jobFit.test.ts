import request from "supertest";
import app from "../app";

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

describe("AI Job Fit Score & Skill Gap Analyst Integration Tests", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/fit-score", () => {
    const mockResume = "Software Engineer with 3 years of experience in React and TypeScript.";
    const mockJobDesk = "Looking for a React developer with Docker and Node.js knowledge.";

    it("should successfully calculate fit score and return structured skill gap analysis JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          score: 75,
          pros: [
            "Strong React experience",
            "Good TypeScript knowledge",
          ],
          cons: [
            "No Node.js backend experience listed",
            "Missing Docker containerization skills",
          ],
          recommendations: [
            "Highlight any backend projects in Node.js",
            "Add Docker certification or small project to CV",
          ],
          skillsBreakdown: [
            { skill: "React", status: "MATCH" },
            { skill: "TypeScript", status: "MATCH" },
            { skill: "Node.js", status: "MISSING" },
            { skill: "Docker", status: "MISSING" },
          ],
        }),
      });

      const response = await request(app)
        .post("/api/ai/fit-score")
        .send({
          resumeText: mockResume,
          jobDescription: mockJobDesk,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("score", 75);
      expect(response.body).toHaveProperty("pros");
      expect(response.body).toHaveProperty("cons");
      expect(response.body).toHaveProperty("recommendations");
      expect(response.body).toHaveProperty("skillsBreakdown");

      expect(Array.isArray(response.body.pros)).toBe(true);
      expect(response.body.skillsBreakdown[0]).toEqual({
        skill: "React",
        status: "MATCH",
      });

      // Verify that generateContent was called with the correct model and parameters
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe("gemini-3.5-flash");
      expect(callArgs.contents).toContain(mockResume);
      expect(callArgs.contents).toContain(mockJobDesk);
      expect(callArgs.config.responseMimeType).toBe("application/json");
      expect(callArgs.config.responseSchema).toBeDefined();
    });

    it("should return 400 Bad Request when resumeText is missing", async () => {
      const response = await request(app)
        .post("/api/ai/fit-score")
        .send({
          jobDescription: mockJobDesk,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("resumeText");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request when jobDescription is missing", async () => {
      const response = await request(app)
        .post("/api/ai/fit-score")
        .send({
          resumeText: mockResume,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("jobDescription");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should handle Gemini API errors gracefully and return 502 Bad Gateway", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Gemini error"));

      const response = await request(app)
        .post("/api/ai/fit-score")
        .send({
          resumeText: mockResume,
          jobDescription: mockJobDesk,
        });

      expect(response.status).toBe(502);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Gemini API failed");
    });
  });
});
