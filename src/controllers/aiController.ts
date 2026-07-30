import { ThinkingLevel } from "@google/genai";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { getGeminiClient } from "../lib/gemini";
import logger from "../lib/logger";
import { parseJobSchema, tailorSchema, outreachSchema, analyzeCvSchema, jobFitSchema } from "../lib/schemas";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (issue.path.includes("jobDescription")) {
      return res.status(400).json({ error: "jobDescription is required and cannot be empty" });
    }
    if (issue.path.includes("description")) {
      return res.status(400).json({ error: "description is required and cannot be empty" });
    }
    if (issue.path.includes("resumeText")) {
      return res.status(400).json({ error: "resumeText is required and cannot be empty" });
    }
    if (issue.path.includes("fileBase64")) {
      return res.status(400).json({ error: "fileBase64 is required and cannot be empty" });
    }
    if (issue.path.includes("mimeType")) {
      return res.status(400).json({ error: "mimeType is required and cannot be empty" });
    }
    return res.status(400).json({ error: issue.message });
  }

  // Handle Gemini API key configuration errors or execution failures
  if (error.message && error.message.includes("GEMINI_API_KEY")) {
    return res.status(400).json({ error: error.message });
  }

  logger.error("AI Controller Error:", error);
  return res.status(502).json({ error: `Gemini API failed: ${error.message || "Unknown error"}` });
};

/**
 * Endpoint to parse raw job descriptions into structured data
 * POST /api/ai/parse-job
 */
export const parseJobDescription = async (req: Request, res: Response) => {
  try {
    const { description } = parseJobSchema.parse(req.body);

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        companyName: { type: "string" },
        jobTitle: { type: "string" },
        industry: { type: "string" },
        location: { type: "string" },
        expectedSalary: { type: "integer" },
        todos: {
          type: "array",
          items: { type: "string" },
          description: "A checklist of 3-5 specific preparation tasks or follow-up actions for this job (e.g. 'Review system design', 'Brush up on React state management', 'Follow up with recruiter')."
        }
      },
      required: ["companyName", "jobTitle", "todos"]
    };

    const prompt = `
      You are an expert recruiter assistant.
      Analyze the following raw job description text and extract structured key details.
      
      Instructions:
      - If the location, industry, or salary is not mentioned or cannot be inferred, return null or omit it.
      - For the expectedSalary, extract the numeric monthly or total salary value. If a range is given, return the higher end of the range. Convert to a single integer representing monthly or total salary. If it is in IDR (Rp), return the integer value directly (e.g. 20000000).
      - Ensure you extract a list of 3-5 specific, actionable preparation tasks or todo items (todos) for a candidate applying to this job.
      
      Job description:
      ${description}
    `;

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-3.1-flash-lite", useThinking: true },
      { name: "gemini-3-flash-preview", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: false },
      { name: "gemini-2.5-flash-native-audio-preview-12-2025", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting job parsing with model: ${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        // Ensure we got a valid response text
        if (response && response.text) {
          logger.info(`Successfully parsed job description using model: ${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model ${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model ${modelConfig.name} failed. Error: ${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Endpoint to analyze job descriptions against resume and write a cover letter
 * POST /api/ai/tailor
 */
export const tailorResume = async (req: Request, res: Response) => {
  try {
    const { jobDescription, resumeText } = tailorSchema.parse(req.body);

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        keySkills: {
          type: "array",
          items: { type: "string" },
          description: "List of matching key skills found in both the job description and the resume."
        },
        missingKeywords: {
          type: "array",
          items: { type: "string" },
          description: "List of important skills/keywords from the job description that the resume lacks."
        },
        coverLetter: {
          type: "string",
          description: "A professional, tailored cover letter draft matching the candidate's experience to the job requirements."
        }
      },
      required: ["keySkills", "missingKeywords", "coverLetter"]
    };

    const prompt = `
      You are an expert career coach and professional resume writer.
      Analyze the following job description and the candidate's resume/CV text.
      
      Job Description:
      \${jobDescription}
      
      Candidate Resume/CV:
      \${resumeText}
      
      Tasks:
      1. Identify matching "keySkills" (skills listed in the job description that the candidate already has in their resume).
      2. Identify "missingKeywords" (important keywords, skills, or terminologies from the job description that are missing or weak in the candidate's resume).
      3. Write a highly tailored "coverLetter" draft (professional, engaging, directly addressing the key requirements of the job description, and highlighting how the candidate's experience fits them).
      
      Generate a JSON response conforming strictly to the requested schema.
    `;

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-3.1-flash-lite", useThinking: true },
      { name: "gemini-3-flash-preview", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: false },
      { name: "gemini-2.5-flash-native-audio-preview-12-2025", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting resume tailoring with model: \${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        if (response && response.text) {
          logger.info(`Successfully tailored resume using model: \${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model \${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model \${modelConfig.name} failed. Error: \${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Endpoint to generate personalized professional outreach templates
 * POST /api/ai/outreach
 */
export const generateOutreach = async (req: Request, res: Response) => {
  try {
    const { type, intent, companyName, jobTitle, recipientName, additionalContext } = outreachSchema.parse(req.body);

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Clear and catchy subject line for the email outreach. Leave blank or empty for LinkedIn message."
        },
        content: {
          type: "string",
          description: "The complete, polished message body."
        }
      },
      required: ["content"]
    };

    const prompt = `
      You are an expert career coach and professional copywriter.
      Write a highly personalized professional outreach message of type "${type}" with the intent "${intent}".
      
      Job/Company Details:
      - Job Title: \${jobTitle}
      - Company: \${companyName}
      \${recipientName ? \`- Recipient Name: \${recipientName}\` : ""}
      \${additionalContext ? \`- Additional Context: \${additionalContext}\` : ""}
      
      Guidelines:
      1. If type is "EMAIL", provide a clear and professional subject line.
      2. If type is "LINKEDIN", keep it concise (ideally under 300 characters or standard message length) and highly engaging.
      3. Use a friendly yet professional tone. Do not use placeholders like "[Your Name]". Leave a blank line for signature or sign off professionally.
      
      Generate a JSON response conforming strictly to the requested schema.
    `;

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: true },
      { name: "gemini-2.5-pro", useThinking: true },
      { name: "gemini-1.5-flash", useThinking: false },
      { name: "gemini-1.5-pro", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting outreach generation with model: \${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        if (response && response.text) {
          logger.info(`Successfully generated outreach message using model: \${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model \${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model \${modelConfig.name} failed. Error: \${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Endpoint to analyze a CV file and return feedback (privacy-first, not saved)
 * POST /api/ai/analyze-cv
 */
export const analyzeCv = async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType, jobDescription } = analyzeCvSchema.parse(req.body);

    const allowedMimeTypes = ["application/pdf", "text/plain"];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: "Unsupported file type. Only PDF and TXT files are allowed." });
    }

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        atsScore: {
          type: "integer",
          description: "An ATS compliance and friendliness score between 0 and 100 based on keyword density, formatting, and sections."
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "List of key strengths, skills, and qualifications found in the CV (What Good)."
        },
        improvements: {
          type: "array",
          items: { type: "string" },
          description: "List of actionable areas of improvement in terms of phrasing, formatting, metrics, or content (What to Improve)."
        },
        missingElements: {
          type: "array",
          items: { type: "string" },
          description: "Key elements, sections, skills, or achievements that are missing and should be added (What to Add)."
        },
        otherFeedback: {
          type: "string",
          description: "Other feedback, general advice on layout, readability, or ATS compatibility."
        }
      },
      required: ["atsScore", "strengths", "improvements", "missingElements", "otherFeedback"]
    };

    let prompt = "";
    if (jobDescription && jobDescription.trim() !== "") {
      prompt = `
        You are an expert recruiter and career strategist.
        Analyze the provided CV document and compare it with this specific Job Description to generate a tailored feedback report, including a suitability and ATS friendliness match score (0 to 100).
        
        Job Description:
        ${jobDescription}
        
        Tasks:
        1. Rate the match and ATS friendliness score from 0 (poor fit/formatting) to 100 (perfect fit & highly optimized).
        2. List the strengths of the CV (what is good, how it matches the job description requirements).
        3. List clear, actionable points for improvement to better align with the job description.
        4. List key skills, requirements, or keywords from the job description that are missing or should be added to the CV.
        5. Provide any other general advice or formatting feedback.
        
        Generate a JSON response conforming strictly to the requested schema.
      `;
    } else {
      prompt = `
        You are an expert recruiter and career strategist.
        Analyze the provided CV document and generate a thorough feedback report, including an ATS friendliness score (0 to 100).
        
        Tasks:
        1. Rate the ATS friendliness score from 0 (very poor formatting/keywords) to 100 (fully optimized).
        2. List the strengths of the CV (what is good, what stands out).
        3. List clear, actionable points for improvement.
        4. List elements, keywords, or sections that are missing or should be added to make it stronger.
        5. Provide any other general advice or formatting feedback.
        
        Generate a JSON response conforming strictly to the requested schema.
      `;
    }

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-3.1-flash-lite", useThinking: true },
      { name: "gemini-3-flash-preview", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting CV analysis with model: ${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: [
            {
              inlineData: {
                data: fileBase64,
                mimeType: mimeType,
              },
            },
            prompt,
          ],
          config,
        });

        if (response && response.text) {
          logger.info(`Successfully analyzed CV using model: ${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model ${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model ${modelConfig.name} failed. Error: ${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Endpoint to analyze job fit score and skill gaps based on CV vs Job Description
 * POST /api/ai/fit-score
 */
export const calculateJobFit = async (req: Request, res: Response) => {
  try {
    const { resumeText, jobDescription } = jobFitSchema.parse(req.body);

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        score: {
          type: "integer",
          description: "A suitability fit score between 0 and 100 representing how well the CV matches the Job Description requirements."
        },
        pros: {
          type: "array",
          items: { type: "string" },
          description: "List of key qualifications/experiences from the CV that align well with the job requirements."
        },
        cons: {
          type: "array",
          items: { type: "string" },
          description: "List of qualifications/requirements from the job description that the candidate lacks or has weak evidence of in the CV."
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Actionable recommendations on how the candidate can bridge gaps or tailor their resume specifically for this job."
        },
        skillsBreakdown: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skill: { type: "string" },
              status: {
                type: "string",
                enum: ["MATCH", "PARTIAL", "MISSING"]
              }
            },
            required: ["skill", "status"]
          },
          description: "A breakdown of specific key skills requested in the job description and their match status on the CV."
        }
      },
      required: ["score", "pros", "cons", "recommendations", "skillsBreakdown"]
    };

    const prompt = `
      You are an expert career strategist and recruiter.
      Analyze the candidate's CV/Resume text against the Job Description.
      
      Candidate CV:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Tasks:
      1. Calculate a fit score from 0 (no matching requirements) to 100 (fully matching).
      2. List 2-4 pros (strengths/matches).
      3. List 2-4 cons (gaps/missing elements).
      4. Give 2-4 tailored recommendations to bridge the gaps.
      5. Identify 4-8 key skills/requirements in the job description and label each as "MATCH", "PARTIAL" or "MISSING" based on the candidate's CV.
      
      Generate a JSON response conforming strictly to the requested schema.
    `;

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-3.1-flash-lite", useThinking: true },
      { name: "gemini-3-flash-preview", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting job fit calculation with model: ${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        if (response && response.text) {
          logger.info(`Successfully calculated job fit using model: ${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model ${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model ${modelConfig.name} failed. Error: ${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};


