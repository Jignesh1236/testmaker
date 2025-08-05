import { 
  tests, 
  questions, 
  testAttempts, 
  type Test, 
  type Question, 
  type TestAttempt, 
  type InsertTest, 
  type InsertQuestion, 
  type InsertTestAttempt,
  type TestWithQuestions,
  type TestWithStats,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, avg, sum } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(tests).where(eq(tests.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // For now, we don't have user authentication, so return undefined
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(tests)
      .values(insertUser)
      .returning();
    return user;
  }

  async createTest(test: InsertTest): Promise<Test> {
    const [createdTest] = await db
      .insert(tests)
      .values({
        ...test,
        updatedAt: new Date(),
      })
      .returning();
    return createdTest;
  }

  async getTest(id: string): Promise<Test | undefined> {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, id));
    return test || undefined;
  }

  async getTestWithQuestions(id: string): Promise<TestWithQuestions | undefined> {
    const test = await this.getTest(id);
    if (!test) return undefined;

    const testQuestions = await this.getTestQuestions(id);
    
    return {
      ...test,
      questions: testQuestions,
    };
  }

  async getTestStats(id: string): Promise<TestWithStats | undefined> {
    const test = await this.getTest(id);
    if (!test) return undefined;

    const stats = await db
      .select({
        totalAttempts: count(testAttempts.id),
        averageScore: avg(testAttempts.score),
        completedAttempts: sum(sql`CASE WHEN ${testAttempts.isCompleted} THEN 1 ELSE 0 END`),
        averageTime: avg(testAttempts.timeTaken),
      })
      .from(testAttempts)
      .where(eq(testAttempts.testId, id));

    const { totalAttempts, averageScore, completedAttempts, averageTime } = stats[0];

    return {
      ...test,
      totalAttempts: Number(totalAttempts) || 0,
      averageScore: Number(averageScore) || 0,
      completionRate: totalAttempts > 0 ? (Number(completedAttempts) / Number(totalAttempts)) * 100 : 0,
      averageTime: Number(averageTime) || 0,
    };
  }

  async getAllTests(): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .orderBy(desc(tests.createdAt));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [createdQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    return createdQuestion;
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    
    return await db
      .insert(questions)
      .values(questionList)
      .returning();
  }

  async getTestQuestions(testId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.testId, testId))
      .orderBy(questions.order);
  }

  async createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt> {
    const [createdAttempt] = await db
      .insert(testAttempts)
      .values(attempt)
      .returning();
    return createdAttempt;
  }

  async updateTestAttempt(id: string, updates: Partial<TestAttempt>): Promise<TestAttempt | undefined> {
    const [updatedAttempt] = await db
      .update(testAttempts)
      .set({
        ...updates,
        ...(updates.isCompleted && { submittedAt: new Date() }),
      })
      .where(eq(testAttempts.id, id))
      .returning();
    return updatedAttempt || undefined;
  }

  async getTestAttempts(testId: string): Promise<TestAttempt[]> {
    return await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.testId, testId))
      .orderBy(desc(testAttempts.startedAt));
  }

  async getTestAttempt(id: string): Promise<TestAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.id, id));
    return attempt || undefined;
  }
}

export const storage = new DatabaseStorage();
