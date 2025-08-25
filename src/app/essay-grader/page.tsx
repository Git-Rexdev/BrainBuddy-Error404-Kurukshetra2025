"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Star, Lightbulb } from "lucide-react";
import { API_BASE } from "@/lib/api";
import Cookies from "js-cookie";

interface EssayAnalysis {
  essay: string;
  predicted_score: number;
  explanation: string;
}

export default function EssayGraderPage() {
  const [essay, setEssay] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!essay.trim()) {
      setError("Please enter an essay to analyze");
      return;
    }

    const token = Cookies.get("bb_token");
    if (!token) {
      setError("Please log in to use the essay grader");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch(`${API_BASE}/api/essay/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ essay: essay.trim() }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EssayAnalysis = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze essay");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Essay Grader
        </h1>
        <p className="text-muted-foreground mt-2">
          Submit your essay for AI-powered analysis and receive detailed feedback with scoring
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Essay</CardTitle>
            <CardDescription>
              Paste your essay below and click analyze to get instant feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your essay here... (minimum 50 words recommended)"
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              className="min-h-[300px] resize-none"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {essay.length} characters
              </span>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !essay.trim()}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Analyze Essay
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Your essay evaluation and detailed feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analysis && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Submit an essay to see the analysis results</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing your essay...</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-6">
                {/* Score Display */}
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                  <div className="text-2xl font-bold text-primary mb-2">
                    Score: {analysis.predicted_score.toFixed(2)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-lg px-4 py-2 ${getScoreColor(analysis.predicted_score)}`}
                  >
                    {getScoreLabel(analysis.predicted_score)}
                  </Badge>
                </div>

                {/* Explanation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    Detailed Feedback
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {analysis.explanation}
                    </p>
                  </div>
                </div>

                {/* Original Essay */}
                <div className="space-y-3">
                  <div className="text-lg font-semibold">Original Essay</div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{analysis.essay}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 