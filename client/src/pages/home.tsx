import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Upload, Link as LinkIcon, Timer, ChartLine, Rocket, BarChart3, Plus, Eye, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["/api/tests"],
    select: (data) => data.slice(0, 5), // Show only latest 5 tests
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 rounded-lg p-2">
                <ClipboardCheck className="text-white text-xl" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Auto Test Generator</h1>
                <p className="text-xs text-slate-500">Create & Share Tests Instantly</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800" asChild>
                <Link href="/tests">
                  <BarChart3 className="mr-2" size={16} />
                  My Tests
                </Link>
              </Button>
              <Button asChild className="bg-blue-500 hover:bg-blue-600">
                <Link href="/create">
                  <Plus className="mr-2" size={16} />
                  Create Test
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Create Tests in Minutes, Share in Seconds
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Upload questions, generate unique test links, and track live results with our powerful test creation platform.
            </p>
            
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <Card className="border border-slate-200">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-500 mb-2">2,500+</div>
                  <div className="text-sm text-slate-600">Tests Created</div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-emerald-500 mb-2">45,000+</div>
                  <div className="text-sm text-slate-600">Test Attempts</div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-indigo-500 mb-2">98%</div>
                  <div className="text-sm text-slate-600">Success Rate</div>
                </CardContent>
              </Card>
            </div>

            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600 px-8 py-4 text-lg font-semibold">
              <Link href="/create">
                <Rocket className="mr-3" size={20} />
                Start Creating Tests
              </Link>
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="text-blue-500" size={24} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Easy Upload</h3>
                <p className="text-sm text-slate-600">Upload questions via form or bulk CSV/Excel import</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <LinkIcon className="text-emerald-500" size={24} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Instant Sharing</h3>
                <p className="text-sm text-slate-600">Get unique test links to share with students instantly</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Timer className="text-amber-500" size={24} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Timed Tests</h3>
                <p className="text-sm text-slate-600">Set time limits and auto-submit when time expires</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <ChartLine className="text-indigo-500" size={24} />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Live Results</h3>
                <p className="text-sm text-slate-600">Track test attempts and scores in real-time</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Tests Section */}
        {tests.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Recent Tests</h3>
              <Button variant="outline" asChild>
                <Link href="/create">
                  <Plus className="mr-2" size={16} />
                  Create New Test
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tests.map((test: any) => (
                <Card key={test.id} className="hover:shadow-lg transition-shadow border border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
                          {test.title}
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <div className="flex items-center">
                            <Clock className="mr-1" size={14} />
                            {test.duration} min
                          </div>
                          <div className="flex items-center">
                            <ClipboardCheck className="mr-1" size={14} />
                            Active Test
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/test/${test.id}`}>
                            <Eye className="mr-1" size={14} />
                            Preview
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/results/${test.id}`}>
                            <BarChart3 className="mr-1" size={14} />
                            Results
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <div className="text-xs font-medium text-slate-500 mb-1">Test Link</div>
                      <div className="text-sm text-blue-600 font-mono break-all select-all">
                        {window.location.origin}/test/{test.id}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-500 mb-1">Results Dashboard</div>
                      <div className="text-sm text-indigo-600 font-mono break-all select-all">
                        {window.location.origin}/results/{test.id}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
