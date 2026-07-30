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

describe("AI CV Feedback & Improvement Analyst Integration Tests", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/analyze-cv", () => {
    const mockPdfBase64 = "JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCgogID4+CmVuZG9iag==";
    const mockMimeType = "application/pdf";
    const mockFileName = "cv_test.pdf";

    it("should successfully analyze uploaded CV file and return structured feedback JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          atsScore: 78,
          strengths: [
            "Strong TypeScript and React skills",
            "Consistent experience in full-stack web development",
          ],
          improvements: [
            "Add quantitative metrics for achievements (e.g. % performance improvements)",
            "Make professional summary more concise",
          ],
          missingElements: [
            "No mention of cloud services (AWS/GCP)",
            "Missing portfolio links",
          ],
          otherFeedback: "The layout is good but can be improved with a clean font hierarchy.",
        }),
      });

      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          fileBase64: mockPdfBase64,
          mimeType: mockMimeType,
          fileName: mockFileName,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("atsScore", 78);
      expect(response.body).toHaveProperty("strengths");
      expect(response.body).toHaveProperty("improvements");
      expect(response.body).toHaveProperty("missingElements");
      expect(response.body).toHaveProperty("otherFeedback");
      
      expect(Array.isArray(response.body.strengths)).toBe(true);
      expect(response.body.strengths.length).toBeGreaterThan(0);
      expect(Array.isArray(response.body.improvements)).toBe(true);
      expect(response.body.missingElements).toContain("No mention of cloud services (AWS/GCP)");

      // Verify that generateContent was called with the correct model and parameters
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe("gemini-3.5-flash");
      expect(callArgs.contents).toEqual([
        {
          inlineData: {
            data: mockPdfBase64,
            mimeType: mockMimeType,
          },
        },
        expect.stringContaining("Analyze the provided CV"),
      ]);
      expect(callArgs.config.responseMimeType).toBe("application/json");
      expect(callArgs.config.responseSchema).toBeDefined();
    });

    it("should successfully analyze CV and compare against jobDescription if provided", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          atsScore: 92,
          strengths: ["Matches React requirement"],
          improvements: ["Tailor summary"],
          missingElements: ["Missing Docker"],
          otherFeedback: "Good match.",
        }),
      });

      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          fileBase64: mockPdfBase64,
          mimeType: mockMimeType,
          fileName: mockFileName,
          jobDescription: "Looking for a React developer with Docker experience",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("atsScore", 92);
      expect(response.body.missingElements).toContain("Missing Docker");

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[1]).toContain("compare it with this specific Job Description");
      expect(callArgs.contents[1]).toContain("Looking for a React developer");
    });

    it("should return 400 Bad Request when fileBase64 is missing", async () => {
      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          mimeType: mockMimeType,
          fileName: mockFileName,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("fileBase64");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request when mimeType is missing", async () => {
      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          fileBase64: mockPdfBase64,
          fileName: mockFileName,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("mimeType");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request when mimeType is unsupported (e.g. image/png)", async () => {
      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          fileBase64: mockPdfBase64,
          mimeType: "image/png",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Unsupported file type");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should handle Gemini API errors gracefully and return 502 Bad Gateway", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Gemini error"));

      const response = await request(app)
        .post("/api/ai/analyze-cv")
        .send({
          fileBase64: mockPdfBase64,
          mimeType: mockMimeType,
        });

      expect(response.status).toBe(502);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Gemini API failed");
    });
  });
});
