
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  BarChart3, 
  Copy, 
  Edit, 
  Trash2,
  Clock,
  Users,
  Calendar,
  Archive,
  Download,
  Share2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Test } from "@shared/schema";

export default function TestList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await apiRequest("DELETE", `/api/tests/${testId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Test Deleted",
        description: "Test has been successfully deleted.",
      });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await apiRequest("POST", `/api/tests/${testId}/duplicate`);
      return response.json();
    },
    onSuccess: (newTest) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Test Duplicated",
        description: `"${newTest.title}" has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Duplication Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const copyTestLink = (testId: string) => {
    const link = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Test link has been copied to clipboard.",
    });
  };

  const copyResultsLink = (testId: string) => {
    const link = `${window.location.origin}/results/${testId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Results Link Copied",
      description: "Results dashboard link has been copied to clipboard.",
    });
  };

  const handleDeleteTest = (testId: string) => {
    setTestToDelete(testId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (testToDelete) {
      deleteTestMutation.mutate(testToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Tests</h1>
              <p className="text-slate-600 mt-1">Manage and track your created tests</p>
            </div>
            <Button asChild className="bg-blue-500 hover:bg-blue-600">
              <Link href="/create">
                <Plus className="mr-2" size={16} />
                Create New Test
              </Link>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2" size={16} />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Test List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 mb-4">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Tests Found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery ? "No tests match your search criteria." : "Get started by creating your first test."}
              </p>
              <Button asChild className="bg-blue-500 hover:bg-blue-600">
                <Link href="/create">
                  <Plus className="mr-2" size={16} />
                  Create Your First Test
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-800 mb-2">
                        {test.title}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <div className="flex items-center">
                          <Clock className="mr-1" size={14} />
                          {test.duration} min
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-1" size={14} />
                          {new Date(test.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/test/${test.id}`} className="flex items-center">
                            <Eye className="mr-2" size={14} />
                            Preview Test
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/results/${test.id}`} className="flex items-center">
                            <BarChart3 className="mr-2" size={14} />
                            View Results
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => copyTestLink(test.id)}>
                          <Copy className="mr-2" size={14} />
                          Copy Test Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyResultsLink(test.id)}>
                          <Share2 className="mr-2" size={14} />
                          Copy Results Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateTestMutation.mutate(test.id)}>
                          <Copy className="mr-2" size={14} />
                          Duplicate Test
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTest(test.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2" size={14} />
                          Delete Test
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-500 mb-1">Test Link</div>
                      <div className="text-xs text-blue-600 font-mono break-all">
                        {window.location.origin}/test/{test.id}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/test/${test.id}`}>
                          <Eye className="mr-1" size={14} />
                          Preview
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/results/${test.id}`}>
                          <BarChart3 className="mr-1" size={14} />
                          Results
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete this test? This action cannot be undone and will also delete all associated questions and student attempts.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete} 
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteTestMutation.isPending}
            >
              {deleteTestMutation.isPending ? "Deleting..." : "Delete Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
