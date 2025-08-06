import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  duration: integer("duration").notNull(), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => tests.id, { onDelete: "cascade" }).notNull(),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(), // A, B, C, or D
  marks: integer("marks").default(1).notNull(),
  timeLimit: integer("time_limit"), // in seconds, optional
  order: integer("order").notNull(),
});

export const testAttempts = pgTable("test_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => tests.id, { onDelete: "cascade" }).notNull(),
  studentName: text("student_name"),
  answers: jsonb("answers").notNull(), // { questionId: selectedAnswer }
  score: integer("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  timeTaken: integer("time_taken").notNull(), // in seconds
  isCompleted: boolean("is_completed").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
});

// Relations
export const testsRelations = relations(tests, ({ many }) => ({
  questions: many(questions),
  attempts: many(testAttempts),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  test: one(tests, {
    fields: [questions.testId],
    references: [tests.id],
  }),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  test: one(tests, {
    fields: [testAttempts.testId],
    references: [tests.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).omit({
  id: true,
  startedAt: true,
  submittedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttempts.$inferSelect;

// Extended types for API responses
export type TestWithQuestions = Test & {
  questions: Question[];
};

export type TestWithStats = Test & {
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  averageTime: number;
};

export type AttemptWithTest = TestAttempt & {
  test: Test;
};
