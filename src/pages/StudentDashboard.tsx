import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useStudentSubjects } from '@/hooks/useStudentData';
import { useBranches, useRegulations } from '@/hooks/useBranchesAndRegulations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, GraduationCap } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import collegeLogo from '@/assets/college-logo.png';

const StudentDashboard = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch');
  const regulationId = searchParams.get('regulation');

  if (!branchId || !regulationId) return <Navigate to="/" replace />;

  const { data: subjects = [], isLoading } = useStudentSubjects(branchId, regulationId);
  const { data: branches = [] } = useBranches();
  const { data: regulations = [] } = useRegulations();

  const branchName = branches.find(b => b.id === branchId)?.name || '';
  const regulationName = regulations.find(r => r.id === regulationId)?.name || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={collegeLogo} alt="College Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full bg-white p-0.5 shadow-sm" />
            <div className="text-center">
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight tracking-tight">
                Sir C.R. Reddy College of Engineering
              </h2>
              <p className="text-[10px] sm:text-xs text-primary font-semibold">(Autonomous)</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">StudyEase</h1>
                <p className="text-xs text-muted-foreground">{branchName} • {regulationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />
                Student
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-2 w-full" /></CardContent>
              </Card>
            ))
          ) : subjects.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No subjects yet</h3>
              <p className="text-muted-foreground">Subjects will appear here once faculty adds them.</p>
            </div>
          ) : (
            subjects.map((subject) => {
              const regulation = regulations.find(r => r.id === subject.regulation_id);
              return (
                <Link key={subject.id} to={`/student/subject/${subject.id}?branch=${branchId}&regulation=${regulationId}`}>
                  <Card className="group hover:shadow-lg transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{subject.code}</Badge>
                        {regulation && <Badge variant="outline" className="text-xs">{regulation.name}</Badge>}
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{subject.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>View syllabus</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
