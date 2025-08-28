import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./file-storage";
import { insertTestSchema, insertQuestionSchema, insertTestAttemptSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csv from "csv-parser";
import { readFileSync, unlinkSync } from "fs";

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

  // File upload route for questions (CSV and Text)
  app.post("/api/tests/:testId/questions/upload", upload.single('file'), async (req, res) => {
    try {
      const testId = req.params.testId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('File Upload - File received:', file.originalname);
      console.log('File path:', file.path);

      // Read file content from disk (since we're using dest: 'uploads/')
      const fileContent = readFileSync(file.path, 'utf-8');
      const questions: any[] = [];

      // Detect file type and parse accordingly
      const isTextFile = file.originalname.toLowerCase().endsWith('.txt');

      if (isTextFile) {
        // Parse text file format
        console.log('Parsing text file format...');
        const sections = fileContent.split(/\n\s*\n/).filter(section => section.trim());

        for (const section of sections) {
          const lines = section.trim().split('\n').map(line => line.trim());
          let questionText = '';
          let optionA = '', optionB = '', optionC = '', optionD = '';
          let correctAnswer = '';
          let marks = 1;
          let timeLimit = null;

          for (const line of lines) {
            if (line.startsWith('Q:') || line.startsWith('Question:')) {
              questionText = line.replace(/^Q:|^Question:/, '').trim();
            } else if (line.startsWith('A)') || line.startsWith('A.')) {
              optionA = line.replace(/^A\)|\^A\./, '').trim();
            } else if (line.startsWith('B)') || line.startsWith('B.')) {
              optionB = line.replace(/^B\)|\^B\./, '').trim();
            } else if (line.startsWith('C)') || line.startsWith('C.')) {
              optionC = line.replace(/^C\)|\^C\./, '').trim();
            } else if (line.startsWith('D)') || line.startsWith('D.')) {
              optionD = line.replace(/^D\)|\^D\./, '').trim();
            } else if (line.startsWith('Answer:') || line.startsWith('Correct:')) {
              correctAnswer = line.replace(/^Answer:|^Correct:/, '').trim().toUpperCase();
            } else if (line.startsWith('Marks:')) {
              marks = parseInt(line.replace('Marks:', '').trim()) || 1;
            } else if (line.startsWith('Time:')) {
              timeLimit = parseInt(line.replace('Time:', '').trim()) || null;
            }
          }

          if (questionText && optionA && optionB && optionC && optionD && correctAnswer) {
            questions.push({
              questionText,
              optionA,
              optionB,
              optionC,
              optionD,
              correctAnswer,
              marks,
              timeLimit
            });
          }
        }

        console.log(`Text file parsing complete. Found ${questions.length} questions`);

      } else {
        // Parse CSV format (existing logic)
        console.log('Parsing CSV file format...');
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const values: string[] = [];
          let currentValue = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());

          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          console.log('CSV Row parsed:', row);

          if (row.Question && row['Option A'] && row['Option B'] && row['Option C'] && row['Option D'] && row['Correct Answer']) {
            questions.push({
              questionText: row.Question.replace(/"/g, ''),
              optionA: row['Option A'].replace(/"/g, ''),
              optionB: row['Option B'].replace(/"/g, ''),
              optionC: row['Option C'].replace(/"/g, ''),
              optionD: row['Option D'].replace(/"/g, ''),
              correctAnswer: row['Correct Answer'].replace(/"/g, ''),
              marks: parseInt(row.Marks) || 1,
              timeLimit: row['Time Limit'] ? parseInt(row['Time Limit']) : null
            });
          }
        }

        console.log(`CSV parsing complete. Found ${questions.length} questions`);
      }

      // Add questions to the test
      const createdQuestions = await storage.createQuestions(
        questions.map((q, index) => 
          insertQuestionSchema.parse({ ...q, testId, order: index + 1 })
        )
      );

      console.log(`Successfully created ${createdQuestions.length} questions`);

      // Clean up uploaded file
      unlinkSync(file.path);

      res.json({ 
        message: "Questions uploaded successfully", 
        questions: createdQuestions 
      });

    } catch (error) {
      console.error('File upload error:', error);
      if (req.file && req.file.path) {
        try {
          unlinkSync(req.file.path); // Ensure file is deleted on error
        } catch (unlinkError) {
          console.error('Failed to delete file:', unlinkError);
        }
      }
      res.status(500).json({ message: "Failed to upload file", error: error.message || error });
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