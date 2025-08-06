import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Users, TrendingUp, CheckCircle, Clock, RefreshCw, PieChart, BarChart3, Target, Award, FileText } from "lucide-react";

// Simple Chart Components
const SimpleBarChart = ({ data, title }: { data: Array<{label: string, value: number}>, title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-slate-700">{title}</h4>
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const SimplePieChart = ({ data, title }: { data: Array<{label: string, value: number, color: string}>, title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-slate-700">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <div className="text-sm font-medium">
              {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
import type { TestWithStats, TestAttempt } from "@shared/schema";

export default function ResultsDashboard() {
  const [, params] = useRoute("/results/:testId");
  const testId = params?.testId || "";
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: testStats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery<TestWithStats>({
    queryKey: [`/api/tests/${testId}/stats`],
    enabled: !!testId,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  const { data: attempts, isLoading: attemptsLoading, refetch: refetchAttempts, error: attemptsError } = useQuery<TestAttempt[]>({
    queryKey: [`/api/tests/${testId}/attempts`],
    enabled: !!testId,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeAgo = (date: string) => {
    const now = currentTime.getTime();
    const attemptTime = new Date(date).getTime();
    const diffMinutes = Math.floor((now - attemptTime) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AN"; // Anonymous
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Analytics calculations
  const getScoreDistribution = () => {
    if (!attempts) return [];

    const ranges = [
      { label: "90-100%", min: 90, max: 100, count: 0, color: "#10b981" },
      { label: "80-89%", min: 80, max: 89, count: 0, color: "#3b82f6" },
      { label: "70-79%", min: 70, max: 79, count: 0, color: "#f59e0b" },
      { label: "60-69%", min: 60, max: 69, count: 0, color: "#ef4444" },
      { label: "Below 60%", min: 0, max: 59, count: 0, color: "#6b7280" }
    ];

    attempts.forEach(attempt => {
      const percentage = attempt.totalMarks > 0 ? (attempt.score / attempt.totalMarks) * 100 : 0;
      const range = ranges.find(r => percentage >= r.min && percentage <= r.max);
      if (range) range.count++;
    });

    return ranges.map(r => ({ label: r.label, value: r.count, color: r.color }));
  };

  const getTimeAnalysis = () => {
    if (!attempts) return [];

    const timeRanges = [
      { label: "0-25%", min: 0, max: 0.25, count: 0 },
      { label: "26-50%", min: 0.26, max: 0.5, count: 0 },
      { label: "51-75%", min: 0.51, max: 0.75, count: 0 },
      { label: "76-100%", min: 0.76, max: 1, count: 0 }
    ];

    const maxTime = testStats?.duration ? testStats.duration * 60 : 1800; // 30 min default

    attempts.forEach(attempt => {
      const timeRatio = attempt.timeTaken / maxTime;
      const range = timeRanges.find(r => timeRatio >= r.min && timeRatio <= r.max);
      if (range) range.count++;
    });

    return timeRanges.map(r => ({ label: r.label, value: r.count }));
  };

  const exportToCSV = () => {
    if (!attempts || attempts.length === 0) {
      alert("No data to export");
      return;
    }

    const csvHeader = "Student Name,Score,Percentage,Time Taken,Submitted At,Status\n";
    const csvData = attempts
      .map(attempt => {
        const percentage = attempt.totalMarks > 0 ? ((attempt.score / attempt.totalMarks) * 100).toFixed(1) : "0";
        const timeTaken = attempt.timeTaken ? formatDuration(attempt.timeTaken) : "N/A";
        const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "Not submitted";
        const status = attempt.isCompleted ? "Completed" : "In Progress";

        return `"${attempt.studentName || 'Anonymous'}","${attempt.score}/${attempt.totalMarks}","${percentage}%","${timeTaken}","${submittedAt}","${status}"`;
      })
      .join("\n");

    const csvContent = csvHeader + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${testStats?.title || 'Test'}_Results.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateCertificate = (studentName: string, testTitle: string, score: number, totalMarks: number) => {
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
    ctx.fillText(studentName || 'Student', 450, 265);

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
        link.download = `${studentName || 'Student'}_${testTitle}_Certificate.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  };

  if (statsLoading || attemptsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!testStats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Test Not Found</h2>
            <p className="text-slate-600">The test results you're looking for don't exist.</p>
            <Button asChild className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Link>
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => { refetchStats(); refetchAttempts(); }}>
                <RefreshCw className="mr-2" size={16} />
                Refresh
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={exportToCSV}
                disabled={!attempts || attempts.length === 0}
              >
                <Download className="mr-2" size={16} />
                Export Results
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Test Results Dashboard</h2>
          <p className="text-slate-600 mt-1">{testStats.title} - Live Results</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Attempts</p>
                  <p className="text-3xl font-bold text-slate-800">{testStats.totalAttempts}</p>
                </div>
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.totalAttempts > 0 ? "Active" : "No attempts yet"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Average Score</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? `${testStats.averageScore.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-emerald-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.averageScore >= 75 ? "Above target" : "Below target"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? `${testStats.completionRate.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-indigo-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-emerald-500 text-sm font-medium">
                  {testStats.completionRate >= 90 ? "Excellent engagement" : "Good engagement"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg. Time</p>
                  <p className="text-3xl font-bold text-slate-800">
                    {testStats.totalAttempts > 0 ? formatDuration(testStats.averageTime) : "N/A"}
                  </p>
                </div>
                <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Clock className="text-amber-500" size={24} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 text-sm font-medium">
                  Out of {testStats.duration} minutes
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="attempts">Live Attempts</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Award className="text-emerald-500" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Highest Score</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {attempts && attempts.length > 0
                          ? `${Math.max(...attempts.map(a => a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0)).toFixed(0)}%`
                          : "N/A"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Target className="text-blue-500" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Pass Rate</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {attempts && attempts.length > 0
                          ? `${((attempts.filter(a => (a.score / a.totalMarks) * 100 >= 60).length / attempts.length) * 100).toFixed(0)}%`
                          : "N/A"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Clock className="text-indigo-500" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Fastest Time</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {attempts && attempts.length > 0
                          ? formatDuration(Math.min(...attempts.map(a => a.timeTaken)))
                          : "N/A"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <PieChart className="mr-2" size={20} />
                    Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SimplePieChart
                    data={getScoreDistribution()}
                    title="Performance Breakdown"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <BarChart3 className="mr-2" size={20} />
                    Time Usage Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart
                    data={getTimeAnalysis()}
                    title="Time Completion Ranges"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attempts">
            {/* Live Results Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">Live Test Attempts</CardTitle>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-600">Live Updates</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!attempts || attempts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-slate-400 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-slate-800 mb-2">No Attempts Yet</h3>
                    <p className="text-slate-600">Test attempts will appear here once students start taking the test.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Correct/Total</TableHead>
                          <TableHead>Time Taken</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attempts.map((attempt) => {
                          const percentage = attempt.totalMarks > 0 ? (attempt.score / attempt.totalMarks) * 100 : 0;
                          const correctAnswers = Math.round((attempt.score / attempt.totalMarks) * Object.keys(attempt.answers as object).length) || 0;
                          const totalQuestions = Object.keys(attempt.answers as object).length || 0;

                          return (
                            <TableRow key={attempt.id} className="hover:bg-slate-50">
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-blue-600 text-sm font-medium">
                                      {getInitials(attempt.studentName)}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">
                                    {attempt.studentName || "Anonymous"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className={`text-sm font-semibold ${getScoreColor(percentage)} mr-2`}>
                                    {percentage.toFixed(0)}%
                                  </span>
                                  <div className="w-16 bg-slate-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        percentage >= 80 ? 'bg-emerald-500' :
                                        percentage >= 60 ? 'bg-blue-500' :
                                        percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-900">
                                {correctAnswers}/{totalQuestions}
                              </TableCell>
                              <TableCell className="text-sm text-slate-900">
                                {formatDuration(attempt.timeTaken)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={attempt.isCompleted ? "default" : "secondary"}
                                  className={
                                    attempt.isCompleted
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                      : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                  }
                                >
                                  {attempt.isCompleted ? "Completed" : "In Progress"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {attempt.submittedAt ? formatTimeAgo(attempt.submittedAt.toString()) : "-"}
                              </TableCell>
                              <TableCell>
                                {attempt.isCompleted && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => generateCertificate(
                                      attempt.studentName || 'Anonymous',
                                      testStats?.title || 'Test',
                                      attempt.score,
                                      attempt.totalMarks
                                    )}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <FileText className="mr-1" size={14} />
                                    Certificate
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {attempts && attempts.length > 0 ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Overall Performance</h4>
                        <p className="text-sm text-blue-700">
                          {testStats && testStats.averageScore >= 75
                            ? "Strong performance! Most students are meeting expectations."
                            : "Consider reviewing difficult topics with students."
                          }
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <h4 className="font-medium text-emerald-800 mb-2">Time Management</h4>
                        <p className="text-sm text-emerald-700">
                          {testStats && testStats.averageTime < (testStats.duration * 60 * 0.8)
                            ? "Students are completing the test efficiently."
                            : "Students might need more time or practice."
                          }
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <BarChart3 size={48} className="mx-auto mb-3" />
                      <p>Insights will appear once students start taking the test.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-700">
                      💡 Share the test link early to maximize participation
                    </p>
                  </div>
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      📊 Monitor results in real-time during test sessions
                    </p>
                  </div>
                  <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-700">
                      📋 Export results for detailed analysis and record-keeping
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}