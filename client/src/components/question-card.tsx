import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Question } from "@shared/schema";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
}

export function QuestionCard({ 
  question, 
  questionNumber, 
  selectedAnswer, 
  onAnswerChange 
}: QuestionCardProps) {
  const options = [
    { value: "A", text: question.optionA },
    { value: "B", text: question.optionB },
    { value: "C", text: question.optionC },
    { value: "D", text: question.optionD },
  ];

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              Question {questionNumber}
            </span>
            <span className="text-sm text-slate-500">{question.marks} marks</span>
          </div>
          <h3 className="text-xl font-medium text-slate-800 leading-relaxed">
            {question.questionText}
          </h3>
        </div>

        <RadioGroup value={selectedAnswer} onValueChange={onAnswerChange}>
          <div className="space-y-3">
            {options.map((option) => (
              <div key={option.value}>
                <Label 
                  htmlFor={`${question.id}-${option.value}`}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={`${question.id}-${option.value}`}
                    className="mr-4" 
                  />
                  <div className="flex items-center">
                    <span className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      {option.value}
                    </span>
                    <span className="text-slate-700">{option.text}</span>
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
