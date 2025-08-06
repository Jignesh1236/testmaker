import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./file-storage";
import { insertTestSchema, insertQuestionSchema, insertTestAttemptSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csv from "csv-parser";
import { createReadStream, unlinkSync } from "fs";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // Test routes
  app.post("/api/tests", async (req, res) => {
    try {
      const validatedData = insertTestSchema.parse(req.body);
      const test = await storage.createTest(validatedData);
      res.json(test);
    } catch (error) {
      res.status(400).json({ message: "Invalid test data", error });
    }
  });

  app.get("/api/tests", async (req, res) => {
    try {
      const tests = await storage.getAllTests();
      res.json(tests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tests", error });
    }
  });

  app.get("/api/tests/:id", async (req, res) => {
    try {
      const test = await storage.getTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test", error });
    }
  });

  app.get("/api/tests/:id/with-questions", async (req, res) => {
    try {
      const test = await storage.getTestWithQuestions(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test with questions", error });
    }
  });

  app.get("/api/tests/:id/stats", async (req, res) => {
    try {
      const testStats = await storage.getTestStats(req.params.id);
      if (!testStats) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(testStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test stats", error });
    }
  });

  app.delete("/api/tests/:id", async (req, res) => {
    try {
      const result = await storage.deleteTest(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json({ message: "Test deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete test", error });
    }
  });

  app.post("/api/tests/:id/duplicate", async (req, res) => {
    try {
      const duplicatedTest = await storage.duplicateTest(req.params.id);
      if (!duplicatedTest) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(duplicatedTest);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate test", error });
    }
  });

  // Question routes
  app.post("/api/tests/:testId/questions", async (req, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }

      const validatedQuestions = questions.map((q, index) => 
        insertQuestionSchema.parse({ ...q, testId: req.params.testId, order: index + 1 })
      );

      const createdQuestions = await storage.createQuestions(validatedQuestions);
      res.json(createdQuestions);
    } catch (error) {
      res.status(400).json({ message: "Invalid question data", error });
    }
  });

  app.get("/api/tests/:testId/questions", async (req, res) => {
    try {
      const questions = await storage.getTestQuestions(req.params.testId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions", error });
    }
  });

  // CSV upload route
  app.post("/api/tests/:testId/questions/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("CSV Upload - File received:", req.file.originalname);
      
      const testId = req.params.testId;
      const csvQuestions: any[] = [];
      
      // Parse CSV file
      const parsePromise = new Promise((resolve, reject) => {
        createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (row) => {
            console.log("CSV Row parsed:", row);
            
            // Convert CSV row to question format
            const question = {
              testId,
              questionText: row['Question'] || row['question'] || '',
              optionA: row['Option A'] || row['option_a'] || '',
              optionB: row['Option B'] || row['option_b'] || '', 
              optionC: row['Option C'] || row['option_c'] || '',
              optionD: row['Option D'] || row['option_d'] || '',
              correctAnswer: row['Correct Answer'] || row['correct_answer'] || 'A',
              marks: parseInt(row['Marks'] || row['marks'] || '1'),
              timeLimit: row['Time Limit'] ? parseInt(row['Time Limit']) : null,
              order: csvQuestions.length + 1
            };
            
            csvQuestions.push(question);
          })
          .on('end', () => {
            console.log(`CSV parsing complete. Found ${csvQuestions.length} questions`);
            resolve(csvQuestions);
          })
          .on('error', (error) => {
            console.error("CSV parsing error:", error);
            reject(error);
          });
      });

      await parsePromise;

      if (csvQuestions.length === 0) {
        unlinkSync(req.file.path);
        return res.status(400).json({ message: "No valid questions found in CSV file" });
      }

      // Validate all questions
      const validatedQuestions = csvQuestions.map((q, index) => {
        try {
          return insertQuestionSchema.parse(q);
        } catch (error) {
          console.error(`Validation error for question ${index + 1}:`, error);
          throw new Error(`Question ${index + 1}: ${error.message}`);
        }
      });

      // Save questions to storage
      const createdQuestions = await storage.createQuestions(validatedQuestions);
      
      // Clean up uploaded file
      unlinkSync(req.file.path);
      
      console.log(`Successfully created ${createdQuestions.length} questions`);
      
      res.json({ 
        message: `Successfully uploaded ${createdQuestions.length} questions`,
        questions: createdQuestions 
      });

    } catch (error) {
      console.error("CSV upload error:", error);
      if (req.file) {
        unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        message: "Failed to upload CSV", 
        error: error.message || error 
      });
    }
  });

  // Test attempt routes
  app.post("/api/tests/:testId/attempts", async (req, res) => {
    try {
      const attemptData = insertTestAttemptSchema.parse({
        ...req.body,
        testId: req.params.testId,
      });
      
      const attempt = await storage.createTestAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      res.status(400).json({ message: "Invalid attempt data", error });
    }
  });

  app.put("/api/attempts/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updatedAttempt = await storage.updateTestAttempt(req.params.id, updates);
      
      if (!updatedAttempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      
      res.json(updatedAttempt);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attempt", error });
    }
  });

  app.get("/api/tests/:testId/attempts", async (req, res) => {
    try {
      const attempts = await storage.getTestAttempts(req.params.testId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attempts", error });
    }
  });

  app.get("/api/attempts/:id", async (req, res) => {
    try {
      const attempt = await storage.getTestAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      res.json(attempt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attempt", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
