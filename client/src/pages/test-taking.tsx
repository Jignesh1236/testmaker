import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TestTimer } from "@/components/test-timer";
import { QuestionCard } from "@/components/question-card";
import type { TestWithQuestions, TestAttempt } from "@shared/schema";

export default function TestTaking() {
  const [, params] = useRoute("/test/:testId");
  const testId = params?.testId || "";
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState("");
  const [attemptId, setAttemptId] = useState<string>("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [startTime, setStartTime] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: test, isLoading, error } = useQuery<TestWithQuestions>({
    queryKey: ["/api/tests", testId, "with-questions"],
    enabled: !!testId,
  });

  const createAttemptMutation = useMutation({
    mutationFn: async (data: { studentName?: string }) => {
      const response = await apiRequest("POST", `/api/tests/${testId}/attempts`, {
        studentName: data.studentName || null,
        answers: {},
        score: 0,
        totalMarks: 0,
        timeTaken: 0,
        isCompleted: false,
      });
      return await response.json();
    },
    onSuccess: (attempt: TestAttempt) => {
      setAttemptId(attempt.id);
      setHasStarted(true);
      setStartTime(new Date());
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitTestMutation = useMutation({
    mutationFn: async () => {
      if (!test || !attemptId || !startTime) return;

      const timeTaken = Math.floor((Date.now() - startTime.getTime()) / 1000);
      let score = 0;
      let totalMarks = 0;

      test.questions.forEach((question) => {
        totalMarks += question.marks;
        if (answers[question.id] === question.correctAnswer) {
          score += question.marks;
        }
      });

      const response = await apiRequest("PUT", `/api/attempts/${attemptId}`, {
        answers,
        score,
        totalMarks,
        timeTaken,
        isCompleted: true,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Submitted Successfully!",
        description: "Thank you for completing the test.",
      });
      // Redirect to a success page or show results
    },
    onError: (error) => {
      toast({
        title: "Failed to Submit Test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTimeUp = () => {
    setTimeUp(true);
    submitTestMutation.mutate();
  };

  const handleStartTest = () => {
    createAttemptMutation.mutate({ studentName: studentName.trim() || undefined });
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = () => {
    setShowSubmitModal(false);
    submitTestMutation.mutate();
  };

  const currentQuestion = test?.questions[currentQuestionIndex];
  const isLastQuestion = test && currentQuestionIndex === test.questions.length - 1;
  const progress = test ? ((currentQuestionIndex + 1) / test.questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Test Not Found</h2>
            <p className="text-slate-600">The test you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{test.title}</h2>
            <div className="space-y-4 mb-6">
              <div className="text-sm text-slate-600">
                <Clock className="inline mr-2" size={16} />
                Duration: {test.duration} minutes
              </div>
              <div className="text-sm text-slate-600">
                Questions: {test.questions.length}
              </div>
            </div>
            
            <div className="mb-6">
              <Label htmlFor="studentName" className="text-sm font-medium text-slate-700">
                Your Name (Optional)
              </Label>
              <Input
                id="studentName"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleStartTest} 
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={createAttemptMutation.isPending}
            >
              {createAttemptMutation.isPending ? "Starting..." : "Start Test"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitTestMutation.isSuccess || timeUp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Completed!</h2>
            <p className="text-slate-600">
              {timeUp ? "Time's up! Your test has been submitted automatically." : "Thank you for completing the test."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Test Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{test.title}</h2>
                <p className="text-slate-600">Complete all questions within the time limit</p>
              </div>
              <TestTimer
                duration={test.duration}
                onTimeUp={handleTimeUp}
                startTime={startTime}
              />
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progress</span>
              <span className="text-sm text-slate-500">
                Question {currentQuestionIndex + 1} of {test.questions.length}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>

        {/* Question Card */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={answers[currentQuestion.id] || ""}
            onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
          />
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-2" size={16} />
            Previous
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
              <Flag className="mr-2" size={16} />
              Flag for Review
            </Button>
            {isLastQuestion ? (
              <Button onClick={handleSubmitTest} className="bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle className="mr-2" size={16} />
                Submit Test
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} className="bg-blue-500 hover:bg-blue-600">
                Next
                <ChevronRight className="ml-2" size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Test</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600 mb-4">
                Are you sure you want to submit your test? You won't be able to make changes after submission.
              </p>
              <div className="text-sm text-slate-500">
                Answered: {Object.keys(answers).length} of {test.questions.length} questions
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmSubmit} 
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={submitTestMutation.isPending}
              >
                {submitTestMutation.isPending ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
