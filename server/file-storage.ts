import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { 
  Test, 
  Question, 
  TestAttempt, 
  InsertTest, 
  InsertQuestion, 
  InsertTestAttempt,
  TestWithQuestions,
  TestWithStats,
  User,
  InsertUser
} from "@shared/schema";

// Create a data directory in the project root
const DATA_DIR = join(process.cwd(), "test-data");

interface IStorage {
  // User methods (kept for interface compatibility but not used)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Test methods
  createTest(test: InsertTest): Promise<Test>;
  getTest(id: string): Promise<Test | undefined>;
  getTestWithQuestions(id: string): Promise<TestWithQuestions | undefined>;
  getTestStats(id: string): Promise<TestWithStats | undefined>;
  getAllTests(): Promise<Test[]>;
  
  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  createQuestions(questions: InsertQuestion[]): Promise<Question[]>;
  getTestQuestions(testId: string): Promise<Question[]>;
  
  // Test attempt methods
  createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt>;
  updateTestAttempt(id: string, updates: Partial<TestAttempt>): Promise<TestAttempt | undefined>;
  getTestAttempts(testId: string): Promise<TestAttempt[]>;
  getTestAttempt(id: string): Promise<TestAttempt | undefined>;
}

class FileStorage implements IStorage {
  private testsFile = join(DATA_DIR, "tests.json");
  private questionsFile = join(DATA_DIR, "questions.json");
  private attemptsFile = join(DATA_DIR, "attempts.json");

  constructor() {
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Initialize files if they don't exist
      const files = [this.testsFile, this.questionsFile, this.attemptsFile];
      for (const file of files) {
        try {
          await fs.access(file);
        } catch {
          await fs.writeFile(file, "[]", "utf8");
        }
      }
    } catch (error) {
      console.error("Error creating data directory:", error);
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  // User methods (placeholder implementations)
  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      username: insertUser.username,
      password: insertUser.password,
    };
    return user;
  }

  // Test methods
  async createTest(test: InsertTest): Promise<Test> {
    const tests = await this.readJsonFile<Test>(this.testsFile);
    const newTest: Test = {
      id: randomUUID(),
      ...test,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    tests.push(newTest);
    await this.writeJsonFile(this.testsFile, tests);
    return newTest;
  }

  async getTest(id: string): Promise<Test | undefined> {
    const tests = await this.readJsonFile<Test>(this.testsFile);
    return tests.find(test => test.id === id);
  }

  async getTestWithQuestions(id: string): Promise<TestWithQuestions | undefined> {
    const test = await this.getTest(id);
    if (!test) return undefined;

    const questions = await this.getTestQuestions(id);
    
    return {
      ...test,
      questions,
    };
  }

  async getTestStats(id: string): Promise<TestWithStats | undefined> {
    const test = await this.getTest(id);
    if (!test) return undefined;

    const attempts = await this.getTestAttempts(id);
    const completedAttempts = attempts.filter(a => a.isCompleted);
    
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0 
      ? completedAttempts.reduce((sum, a) => sum + ((a.score / a.totalMarks) * 100), 0) / completedAttempts.length
      : 0;
    const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : 0;
    const averageTime = completedAttempts.length > 0 
      ? completedAttempts.reduce((sum, a) => sum + a.timeTaken, 0) / completedAttempts.length
      : 0;

    return {
      ...test,
      totalAttempts,
      averageScore: Number(averageScore.toFixed(1)),
      completionRate: Number(completionRate.toFixed(1)),
      averageTime: Math.round(averageTime),
    };
  }

  async getAllTests(): Promise<Test[]> {
    const tests = await this.readJsonFile<Test>(this.testsFile);
    return tests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Question methods
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const questions = await this.readJsonFile<Question>(this.questionsFile);
    const newQuestion: Question = {
      id: randomUUID(),
      ...question,
      marks: question.marks ?? 1,
      timeLimit: question.timeLimit ?? null,
    };
    
    questions.push(newQuestion);
    await this.writeJsonFile(this.questionsFile, questions);
    return newQuestion;
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    
    const questions = await this.readJsonFile<Question>(this.questionsFile);
    const newQuestions: Question[] = questionList.map(q => ({
      id: randomUUID(),
      ...q,
      marks: q.marks ?? 1,
      timeLimit: q.timeLimit ?? null,
    }));
    
    questions.push(...newQuestions);
    await this.writeJsonFile(this.questionsFile, questions);
    return newQuestions;
  }

  async getTestQuestions(testId: string): Promise<Question[]> {
    const questions = await this.readJsonFile<Question>(this.questionsFile);
    return questions
      .filter(q => q.testId === testId)
      .sort((a, b) => a.order - b.order);
  }

  // Test attempt methods
  async createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt> {
    const attempts = await this.readJsonFile<TestAttempt>(this.attemptsFile);
    const newAttempt: TestAttempt = {
      id: randomUUID(),
      ...attempt,
      studentName: attempt.studentName ?? null,
      isCompleted: attempt.isCompleted ?? false,
      startedAt: new Date(),
      submittedAt: null,
    };
    
    attempts.push(newAttempt);
    await this.writeJsonFile(this.attemptsFile, attempts);
    return newAttempt;
  }

  async updateTestAttempt(id: string, updates: Partial<TestAttempt>): Promise<TestAttempt | undefined> {
    const attempts = await this.readJsonFile<TestAttempt>(this.attemptsFile);
    const index = attempts.findIndex(a => a.id === id);
    
    if (index === -1) return undefined;
    
    const updatedAttempt = {
      ...attempts[index],
      ...updates,
      ...(updates.isCompleted && { submittedAt: new Date() }),
    };
    
    attempts[index] = updatedAttempt;
    await this.writeJsonFile(this.attemptsFile, attempts);
    return updatedAttempt;
  }

  async getTestAttempts(testId: string): Promise<TestAttempt[]> {
    const attempts = await this.readJsonFile<TestAttempt>(this.attemptsFile);
    return attempts
      .filter(a => a.testId === testId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getTestAttempt(id: string): Promise<TestAttempt | undefined> {
    const attempts = await this.readJsonFile<TestAttempt>(this.attemptsFile);
    return attempts.find(a => a.id === id);
  }
}

export { IStorage };
export const storage = new FileStorage();