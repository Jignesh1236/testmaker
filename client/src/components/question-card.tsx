import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle } from "lucide-react";
import type { Question } from "@shared/schema";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  isPreviewMode?: boolean;
  showResults?: boolean;
  isReadOnly?: boolean;
}

export function QuestionCard({ 
  question, 
  questionNumber, 
  selectedAnswer, 
  onAnswerChange,
  isPreviewMode = false,
  showResults = false,
  isReadOnly = false
}: QuestionCardProps) {
  const options = [
    { value: "A", text: question.optionA },
    { value: "B", text: question.optionB },
    { value: "C", text: question.optionC },
    { value: "D", text: question.optionD },
  ];

  const getOptionStyle = (optionValue: string) => {
    const isCorrect = optionValue === question.correctAnswer;
    const isSelected = selectedAnswer === optionValue;

    if (!isPreviewMode && !showResults) {
      const baseStyle = "flex items-center p-4 border border-slate-200 rounded-lg transition-colors";
      return isReadOnly ? `${baseStyle} cursor-default` : `${baseStyle} hover:bg-slate-50 cursor-pointer`;
    }

    if (isCorrect) {
      return "flex items-center p-4 border-2 border-green-500 bg-green-50 rounded-lg cursor-pointer transition-colors";
    } else if (isSelected && !isCorrect) {
      return "flex items-center p-4 border-2 border-red-500 bg-red-50 rounded-lg cursor-pointer transition-colors";
    } else {
      const baseStyle = "flex items-center p-4 border border-slate-200 rounded-lg transition-colors";
      return isReadOnly ? `${baseStyle} cursor-default` : `${baseStyle} hover:bg-slate-50 cursor-pointer`;
    }
  };

  const getOptionIcon = (optionValue: string) => {
    if (!isPreviewMode && !showResults) return null;

    const isCorrect = optionValue === question.correctAnswer;
    const isSelected = selectedAnswer === optionValue;

    if (isCorrect) {
      return <CheckCircle className="text-green-600 ml-2" size={20} />;
    } else if (isSelected && !isCorrect) {
      return <XCircle className="text-red-600 ml-2" size={20} />;
    }
    return null;
  };

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              Question {questionNumber}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500">{question.marks} marks</span>
              {isPreviewMode && (
                <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                  Preview Mode
                </span>
              )}
            </div>
          </div>
          <h3 className="text-xl font-medium text-slate-800 leading-relaxed">
            {question.questionText}
          </h3>
          {(isPreviewMode || showResults) && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Correct Answer:</strong> {question.correctAnswer} - {
                  options.find(opt => opt.value === question.correctAnswer)?.text
                }
              </div>
              {showResults && selectedAnswer && (
                <div className="text-sm mt-2">
                  <strong>Your Answer:</strong> 
                  <span className={selectedAnswer === question.correctAnswer ? "text-green-700 ml-1" : "text-red-700 ml-1"}>
                    {selectedAnswer} - {options.find(opt => opt.value === selectedAnswer)?.text}
                    {selectedAnswer === question.correctAnswer ? " ✓" : " ✗"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <RadioGroup value={selectedAnswer} onValueChange={isReadOnly ? undefined : onAnswerChange}>
          <div className="space-y-3">
            {options.map((option) => (
              <div key={option.value}>
                <Label 
                  htmlFor={`${question.id}-${option.value}`}
                  className={getOptionStyle(option.value)}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={`${question.id}-${option.value}`}
                    className="mr-4"
                    disabled={isReadOnly}
                  />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <span className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {option.value}
                      </span>
                      <span className="text-slate-700">{option.text}</span>
                    </div>
                    {getOptionIcon(option.value)}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
