import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Upload, Trash2, Save, Wand2, Eye, BarChart3, FileUp, Download } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTestSchema, insertQuestionSchema } from "@shared/schema";

const testFormSchema = insertTestSchema;
const questionFormSchema = insertQuestionSchema.omit({ testId: true, order: true });

type TestFormData = z.infer<typeof testFormSchema>;
type QuestionFormData = z.infer<typeof questionFormSchema>;

export default function CreateTest() {
  const [, setLocation] = useLocation();
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [generatedTestId, setGeneratedTestId] = useState<string>("");
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testForm = useForm<TestFormData>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      title: "",
      duration: 30,
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: { test: TestFormData; questions: QuestionFormData[] }) => {
      // Create test first
      const testResponse = await apiRequest("POST", "/api/tests", data.test);
      const test = await testResponse.json();

      // Then create questions
      if (data.questions.length > 0) {
        await apiRequest("POST", `/api/tests/${test.id}/questions`, { questions: data.questions });
      }

      return test;
    },
    onSuccess: (test) => {
      setGeneratedTestId(test.id);
      setShowGeneratedModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Test Created Successfully!",
        description: "Your test is ready to share with students.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: async (data: { testId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      
      const response = await fetch(`/api/tests/${data.testId}/questions/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload CSV');
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "CSV Uploaded Successfully!",
        description: `Added ${result.questions.length} questions from CSV.`,
      });
      setShowCsvUpload(false);
      
      // Add questions to current form state
      const csvQuestions = result.questions.map((q: any) => ({
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
        timeLimit: q.timeLimit,
      }));
      
      setQuestions(prev => [...prev, ...csvQuestions]);
      
      // Show success modal
      setShowGeneratedModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
    },
    onError: (error) => {
      toast({
        title: "CSV Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "",
        marks: 1,
        timeLimit: 60,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const onSubmit = (testData: TestFormData) => {
    if (questions.length === 0) {
      toast({
        title: "No Questions Added",
        description: "Please add at least one question to create a test.",
        variant: "destructive",
      });
      return;
    }

    // Validate all questions
    const validQuestions = questions.every(q => 
      q.questionText && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer
    );

    if (!validQuestions) {
      toast({
        title: "Incomplete Questions",
        description: "Please fill in all required fields for each question.",
        variant: "destructive",
      });
      return;
    }

    createTestMutation.mutate({ test: testData, questions });
  };

  const handleCsvUpload = async (file: File) => {
    // First create a temporary test if none exists
    let testId = generatedTestId;
    
    if (!testId) {
      // Create a basic test to attach questions to
      const testData = form.getValues();
      if (!testData.title || !testData.duration) {
        toast({
          title: "Complete Test Details First",
          description: "Please fill in test title and duration before uploading CSV.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const testResponse = await apiRequest("POST", "/api/tests", testData);
        const test = await testResponse.json();
        testId = test.id;
        setGeneratedTestId(test.id);
        
        toast({
          title: "Test Created",
          description: "Test created successfully. Now uploading CSV questions...",
        });
      } catch (error) {
        toast({
          title: "Failed to Create Test",
          description: "Please check test details and try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    uploadCsvMutation.mutate({ testId, file });
  };

  const downloadSampleCsv = () => {
    const csvContent = `Question,Option A,Option B,Option C,Option D,Correct Answer,Marks,Time Limit
"What is the capital of India?","Mumbai","Delhi","Chennai","Kolkata","B","1","60"
"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","B","1","45"
"What is 15 + 25?","35","40","45","50","B","1","30"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-questions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const currentDomain = window.location.origin;

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
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Create New Test</h2>
          <p className="text-slate-600 mt-1">Add questions and configure your test settings</p>
        </div>

        <Form {...testForm}>
          <form onSubmit={testForm.handleSubmit(onSubmit)}>
            {/* Test Configuration Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">Test Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={testForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Math Quiz Chapter 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions Section */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">Questions</CardTitle>
                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                      onClick={() => setShowCsvUpload(true)}
                    >
                      <FileUp className="mr-2" size={16} />
                      Bulk Upload CSV
                    </Button>
                    <Button type="button" onClick={addQuestion} className="bg-blue-500 hover:bg-blue-600">
                      <Plus className="mr-2" size={16} />
                      Add Question
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
                    <Plus className="mx-auto text-3xl mb-3" size={48} />
                    <p>Click "Add Question" to add your first question</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card key={index} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Question {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(index)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-700">Question Text</Label>
                              <Textarea
                                placeholder="Enter your question here..."
                                value={question.questionText}
                                onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Option A</Label>
                                <Input
                                  placeholder="Option A"
                                  value={question.optionA}
                                  onChange={(e) => updateQuestion(index, "optionA", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Option B</Label>
                                <Input
                                  placeholder="Option B"
                                  value={question.optionB}
                                  onChange={(e) => updateQuestion(index, "optionB", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Option C</Label>
                                <Input
                                  placeholder="Option C"
                                  value={question.optionC}
                                  onChange={(e) => updateQuestion(index, "optionC", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Option D</Label>
                                <Input
                                  placeholder="Option D"
                                  value={question.optionD}
                                  onChange={(e) => updateQuestion(index, "optionD", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Correct Answer</Label>
                                <Select
                                  value={question.correctAnswer}
                                  onValueChange={(value) => updateQuestion(index, "correctAnswer", value)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select correct answer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">Option A</SelectItem>
                                    <SelectItem value="B">Option B</SelectItem>
                                    <SelectItem value="C">Option C</SelectItem>
                                    <SelectItem value="D">Option D</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Marks</Label>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  value={question.marks}
                                  onChange={(e) => updateQuestion(index, "marks", parseInt(e.target.value) || 1)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700">Time (seconds)</Label>
                                <Input
                                  type="number"
                                  placeholder="60"
                                  value={question.timeLimit || ""}
                                  onChange={(e) => updateQuestion(index, "timeLimit", parseInt(e.target.value) || null)}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="sticky bottom-4 bg-white border-t pt-4 -mx-6 px-6">
              <div className="flex justify-between items-center">
                <Button type="button" variant="secondary" size="lg">
                  <Save className="mr-2" size={16} />
                  Save as Draft
                </Button>
                <Button 
                  type="submit" 
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg" 
                  disabled={createTestMutation.isPending}
                >
                  <Wand2 className="mr-2" size={16} />
                  {createTestMutation.isPending ? "Creating Test..." : "🚀 Generate Test Link"}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        {/* Generated Test Success Modal */}
        <Dialog open={showGeneratedModal} onOpenChange={setShowGeneratedModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="text-emerald-500" size={32} />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-800">
                Test Created Successfully!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center">
              <p className="text-slate-600 mb-6">Your test is ready to share. Use the links below:</p>
              
              <div className="space-y-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Test Link</div>
                  <div className="text-sm text-blue-600 font-mono break-all">
                    {currentDomain}/test/{generatedTestId}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Results Dashboard</div>
                  <div className="text-sm text-indigo-600 font-mono break-all">
                    {currentDomain}/results/{generatedTestId}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600" 
                  onClick={() => setLocation(`/test/${generatedTestId}`)}
                >
                  <Eye className="mr-2" size={16} />
                  Preview Test
                </Button>
                <Button 
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                  onClick={() => setLocation(`/results/${generatedTestId}`)}
                >
                  <BarChart3 className="mr-2" size={16} />
                  View Results
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* CSV Upload Modal */}
        <Dialog open={showCsvUpload} onOpenChange={setShowCsvUpload}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                Bulk Upload Questions via CSV
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">CSV Format Guide</h4>
                <p className="text-blue-700 text-sm mb-3">
                  Your CSV file should have these columns in exact order:
                </p>
                <div className="bg-white rounded border p-3 text-xs font-mono">
                  Question,Option A,Option B,Option C,Option D,Correct Answer,Marks,Time Limit
                </div>
                <div className="mt-3 text-sm text-blue-700">
                  <strong>Important:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Correct Answer should be A, B, C, or D</li>
                    <li>Marks should be a number (default: 1)</li>
                    <li>Time Limit in seconds (optional)</li>
                    <li>Use quotes for text with commas</li>
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Upload CSV File</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadSampleCsv}
                    className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                  >
                    <Download className="mr-2" size={14} />
                    Download Sample
                  </Button>
                </div>
                
                <FileUpload
                  onFileSelect={handleCsvUpload}
                  accept={{ "text/csv": [".csv"] }}
                  disabled={uploadCsvMutation.isPending}
                />
                
                {uploadCsvMutation.isPending && (
                  <div className="mt-3 text-center">
                    <div className="text-sm text-slate-600">Uploading and processing CSV...</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCsvUpload(false)}
                  disabled={uploadCsvMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
