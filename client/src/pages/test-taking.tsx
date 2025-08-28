import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, Award } from "lucide-react";
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
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showResults, setShowResults] = useState(false);
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

      shuffledQuestions.forEach((question) => {
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
      setShowResults(true);
      toast({
        title: "Test Submitted Successfully!",
        description: "Thank you for completing the test.",
      });
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
    if (shuffledQuestions && currentQuestionIndex < shuffledQuestions.length - 1) {
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

  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionNav(false);
  };

  const confirmSubmit = () => {
    setShowSubmitModal(false);
    submitTestMutation.mutate();
  };

  // State for shuffled questions
  const [shuffledQuestions, setShuffledQuestions] = useState<NonNullable<typeof test>['questions']>([]);

  // Shuffle questions on test load if shuffle is enabled
  useEffect(() => {
    if (test?.questions && Array.isArray(test.questions)) {
      if (test.shuffleQuestions) {
        const shuffled = [...test.questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setShuffledQuestions(shuffled);
      } else {
        setShuffledQuestions(test.questions);
      }
    } else {
      setShuffledQuestions([]);
    }
  }, [test?.questions, test?.shuffleQuestions]);


  // Function to generate certificate
  const generateCertificate = (name: string, testTitle: string, score: number, totalMarks: number) => {
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create canvas for certificate
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 900;
    canvas.height = 650;

    // Golden background gradient
    const gradient = ctx.createLinearGradient(0, 0, 900, 650);
    gradient.addColorStop(0, '#fef7cd');
    gradient.addColorStop(0.5, '#fef3c7');
    gradient.addColorStop(1, '#fde68a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 650);

    // Outer golden border
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, 870, 620);

    // Inner golden border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(35, 35, 830, 580);

    // Decorative corner elements
    ctx.fillStyle = '#d97706';
    ctx.fillRect(45, 45, 80, 4);
    ctx.fillRect(45, 45, 4, 80);
    ctx.fillRect(775, 45, 80, 4);
    ctx.fillRect(851, 45, 4, 80);
    ctx.fillRect(45, 601, 80, 4);
    ctx.fillRect(45, 521, 4, 80);
    ctx.fillRect(775, 601, 80, 4);
    ctx.fillRect(851, 521, 4, 80);

    // Institution name
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SANTMEGH COMPUTER EDUCATION', 450, 100);

    // Certificate title
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 42px Arial';
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 450, 150);

    // Decorative golden line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 170);
    ctx.lineTo(750, 170);
    ctx.stroke();

    // Small decorative elements
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(130, 170, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(770, 170, 8, 0, 2 * Math.PI);
    ctx.fill();

    // "This is to certify that"
    ctx.fillStyle = '#78350f';
    ctx.font = '20px Arial';
    ctx.fillText('This is to certify that', 450, 220);

    // Student name with golden background
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(200, 235, 500, 50);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(200, 235, 500, 50);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(name || 'Student', 450, 265);

    // Achievement text
    ctx.fillStyle = '#78350f';
    ctx.font = '20px Arial';
    ctx.fillText('has successfully completed the examination', 450, 320);

    // Test title
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`"${testTitle}"`, 450, 360);

    // Score with golden accent
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Score: ${score}/${totalMarks} (${percentage.toFixed(1)}%)`, 450, 410);

    // Performance badge
    let performanceText = '';
    let badgeColor = '';
    if (percentage >= 90) {
      performanceText = 'EXCELLENT PERFORMANCE';
      badgeColor = '#16a34a';
    } else if (percentage >= 80) {
      performanceText = 'VERY GOOD PERFORMANCE';
      badgeColor = '#0ea5e9';
    } else if (percentage >= 70) {
      performanceText = 'GOOD PERFORMANCE';
      badgeColor = '#f59e0b';
    } else if (percentage >= 60) {
      performanceText = 'SATISFACTORY PERFORMANCE';
      badgeColor = '#f97316';
    } else {
      performanceText = 'PARTICIPATION CERTIFICATE';
      badgeColor = '#6b7280';
    }

    // Performance badge background
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(250, 430, 400, 40);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(250, 430, 400, 40);

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 22px Arial';
    ctx.fillText(performanceText, 450, 455);

    // Date
    ctx.fillStyle = '#78350f';
    ctx.font = '18px Arial';
    ctx.fillText(`Completed on ${date}`, 450, 500);

    // Signature line
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 550);
    ctx.lineTo(550, 550);
    ctx.stroke();

    // Authority signature
    ctx.fillStyle = '#78350f';
    ctx.font = '16px Arial';
    ctx.fillText('Authorized Signature', 450, 570);

    // Footer
    ctx.fillStyle = '#a16207';
    ctx.font = '14px Arial';
    ctx.fillText('Santmegh Computer Education - Excellence in Learning', 450, 610);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name || 'Student'}_${testTitle}_Certificate.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Certificate Downloaded",
          description: `Certificate for ${name} has been generated and downloaded.`,
        });
      }
    });
  };


  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const isLastQuestion = shuffledQuestions && currentQuestionIndex === shuffledQuestions.length - 1;
  const progress = shuffledQuestions ? ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100 : 0;

  // Determine if the test is completed for the modal
  const isTestCompleted = submitTestMutation.isSuccess || timeUp;
  // Placeholder for attempt data, which would typically be fetched after submission or from queryClient
  const attempt = submitTestMutation.isSuccess ? {
    score: test?.questions.reduce((acc, q) => acc + (answers[q.id] === q.correctAnswer ? q.marks : 0), 0) || 0,
    totalMarks: test?.questions.reduce((acc, q) => acc + q.marks, 0) || 0,
  } : undefined;


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

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="previewMode"
                  checked={isPreviewMode}
                  onChange={(e) => setIsPreviewMode(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="previewMode" className="text-sm font-medium text-amber-700">
                  Preview Mode (Show correct answers)
                </Label>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Enable this to see which answers are correct or incorrect during the test
              </p>
            </div>

            <Button
              onClick={handleStartTest}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={createAttemptMutation.isPending}
            >
              {createAttemptMutation.isPending ? "Starting..." : (isPreviewMode ? "Start Preview" : "Start Test")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitTestMutation.isSuccess || timeUp) {
    const score = shuffledQuestions.reduce((acc, q) => acc + (answers[q.id] === q.correctAnswer ? q.marks : 0), 0) || 0;
    const totalMarks = shuffledQuestions.reduce((acc, q) => acc + q.marks, 0) || 0;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Header */}
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Completed!</h2>
              <p className="text-slate-600 mb-4">
                {timeUp ? "Time's up! Your test has been submitted automatically." : "Thank you for completing the test."}
              </p>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="text-sm font-medium text-slate-700 mb-2">Your Results</div>
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  {score}/{totalMarks}
                </div>
                <div className="text-lg text-slate-600">
                  {percentage.toFixed(1)}%
                </div>
              </div>

              <Button
                onClick={() => generateCertificate(
                  studentName,
                  test?.title || 'Test',
                  score,
                  totalMarks
                )}
                className="bg-blue-500 hover:bg-blue-600 mb-4"
              >
                <Award className="mr-2" size={16} />
                Download Certificate
              </Button>
            </CardContent>
          </Card>

          {/* Results Review */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Review Your Answers</h3>
            <div className="space-y-6">
              {shuffledQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  questionNumber={index + 1}
                  selectedAnswer={answers[question.id] || ""}
                  onAnswerChange={() => {}} // No-op since it's read-only
                  showResults={true}
                  isReadOnly={true}
                />
              ))}
            </div>
          </div>
        </div>
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
                Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
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
            isPreviewMode={isPreviewMode}
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
            <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50" onClick={() => toggleQuestionFlag(currentQuestion?.id || "")}>
              <Flag className="mr-2" size={16} />
              Flag for Review
            </Button>
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
                Answered: {Object.keys(answers).length} of {shuffledQuestions.length} questions
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

        {/* Test Completed Modal */}
        <Dialog open={isTestCompleted} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-800">
                Test Completed!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center">
              <p className="text-slate-600 mb-4">
                Thank you for completing the test. Your responses have been submitted successfully.
              </p>
              {attempt && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">Your Results</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {attempt.score}/{attempt.totalMarks}
                  </div>
                  <div className="text-sm text-slate-500">
                    {attempt.totalMarks > 0 ? `${((attempt.score / attempt.totalMarks) * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>
              )}

              {/* Certificate Download Section */}
              <div className="mb-4">
                <Button
                  onClick={() => generateCertificate(
                    studentName,
                    test?.title || 'Test',
                    attempt?.score || 0,
                    attempt?.totalMarks || 0
                  )}
                  className="w-full bg-blue-500 hover:bg-blue-600 mb-3"
                >
                  <Award className="mr-2" size={16} />
                  Download Certificate
                </Button>
              </div>

              <p className="text-sm text-slate-500">
                You can now close this tab or take another test.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}