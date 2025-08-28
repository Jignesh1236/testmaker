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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg">
            <p className="text-slate-700 font-medium">Loading your test...</p>
            <p className="text-slate-500 text-sm mt-1">Please wait while we prepare everything</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <Card className="max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Test Not Found</h2>
            <p className="text-slate-600 leading-relaxed">The test you're looking for doesn't exist or has been removed. Please check the link and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-700">
          <CardContent className="p-10">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                {test.title}
              </h2>
              <p className="text-slate-500">Ready to begin your assessment</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="text-blue-600" size={24} />
                </div>
                <div className="text-center">
                  <p className="text-blue-800 font-semibold text-lg">{test.duration}</p>
                  <p className="text-blue-600 text-sm">Minutes</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-emerald-800 font-semibold text-lg">{test.questions.length}</p>
                  <p className="text-emerald-600 text-sm">Questions</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="studentName" className="text-sm font-semibold text-slate-700 mb-2 block">
                Your Name (Optional)
              </Label>
              <Input
                id="studentName"
                placeholder="Enter your full name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="border-2 border-slate-200 focus:border-blue-500 transition-colors duration-200 rounded-xl px-4 py-3"
              />
            </div>

            <div className="mb-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="previewMode"
                  checked={isPreviewMode}
                  onChange={(e) => setIsPreviewMode(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-2 border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <Label htmlFor="previewMode" className="text-sm font-semibold text-amber-800 block mb-1">
                    Preview Mode
                  </Label>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Enable this to see which answers are correct or incorrect during the test. Perfect for practice sessions!
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartTest}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              disabled={createAttemptMutation.isPending}
            >
              {createAttemptMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Starting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {isPreviewMode ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Start Preview
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Start Test
                    </>
                  )}
                </div>
              )}
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Header */}
          <Card className="mb-8 shadow-2xl border-0 bg-white/95 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-700">
            <CardContent className="p-10 text-center">
              <div className="relative mb-6">
                <div className="bg-gradient-to-r from-emerald-400 to-teal-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <CheckCircle className="text-white" size={48} />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 w-12 h-12 rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                Test Completed!
              </h2>
              <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                {timeUp ? (
                  <>🕰️ Time's up! Your test has been submitted automatically. Great effort completing all questions!</>
                ) : (
                  <>🎉 Congratulations! You've successfully completed the test. Thank you for your participation!</>
                )}
              </p>

              {/* Score Display */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 mb-8 border-2 border-slate-200 shadow-inner">
                <div className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Your Performance</div>
                <div className="flex items-center justify-center space-x-6 mb-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                      {score}
                    </div>
                    <div className="text-slate-500 text-sm">Score</div>
                  </div>
                  <div className="text-4xl text-slate-300">/</div>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-slate-700">
                      {totalMarks}
                    </div>
                    <div className="text-slate-500 text-sm">Total</div>
                  </div>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-full font-bold text-xl">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                
                {/* Performance Badge */}
                <div className="inline-block">
                  {percentage >= 90 ? (
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 px-4 py-2 rounded-full">
                      <span className="text-green-800 font-semibold">🏆 Excellent Performance!</span>
                    </div>
                  ) : percentage >= 80 ? (
                    <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 px-4 py-2 rounded-full">
                      <span className="text-blue-800 font-semibold">⭐ Very Good Performance!</span>
                    </div>
                  ) : percentage >= 70 ? (
                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 px-4 py-2 rounded-full">
                      <span className="text-yellow-800 font-semibold">👍 Good Performance!</span>
                    </div>
                  ) : percentage >= 60 ? (
                    <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 px-4 py-2 rounded-full">
                      <span className="text-orange-800 font-semibold">📈 Keep Improving!</span>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 px-4 py-2 rounded-full">
                      <span className="text-purple-800 font-semibold">🎯 Great Effort!</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => generateCertificate(
                  studentName,
                  test?.title || 'Test',
                  score,
                  totalMarks
                )}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 mb-6"
              >
                <Award className="mr-3" size={20} />
                Download Your Certificate
              </Button>
              
              {studentName && (
                <p className="text-slate-500 text-sm">
                  Certificate will be generated for: <span className="font-semibold">{studentName}</span>
                </p>
              )}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Test Header */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {test.title}
                    </h2>
                    {isPreviewMode && (
                      <span className="inline-block bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-medium mt-1">
                        Preview Mode Active
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 text-lg">Complete all questions within the time limit</p>
                {studentName && (
                  <p className="text-slate-500 mt-2">
                    <span className="font-medium">Student:</span> {studentName}
                  </p>
                )}
              </div>
              <div className="lg:flex-shrink-0">
                <TestTimer
                  duration={test.duration}
                  onTimeUp={handleTimeUp}
                  startTime={startTime}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 w-8 h-8 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{currentQuestionIndex + 1}</span>
                </div>
                <span className="text-lg font-semibold text-slate-700">Progress</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-700 block">
                  Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
                </span>
                <span className="text-xs text-slate-500">
                  {Math.round(progress)}% Complete
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress value={progress} className="w-full h-3 bg-slate-200" />
              <div className="absolute top-0 left-0 h-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 py-3 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="mr-2" size={18} />
            Previous Question
          </Button>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 flex-1 sm:flex-none">
            <Button 
              variant="outline" 
              className={`border-2 transition-all duration-200 py-3 px-6 rounded-xl font-semibold ${
                flaggedQuestions.has(currentQuestion?.id || "") 
                  ? "bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200" 
                  : "border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500"
              }`}
              onClick={() => toggleQuestionFlag(currentQuestion?.id || "")}
            >
              <Flag className={`mr-2 ${flaggedQuestions.has(currentQuestion?.id || "") ? "fill-current" : ""}`} size={16} />
              {flaggedQuestions.has(currentQuestion?.id || "") ? "Unflag Question" : "Flag for Review"}
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={handleSubmitTest}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <CheckCircle className="mr-2" size={18} />
                Submit Test
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Next Question
                <ChevronRight className="ml-2" size={18} />
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
