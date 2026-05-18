import { useState, useMemo } from 'react';
import { Link, useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useStudentSubjects } from '@/hooks/useStudentData';
import { useBranches, useRegulations } from '@/hooks/useBranchesAndRegulations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import collegeLogo from '@/assets/college-logo.png';

const SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch');
  const initialRegulation = searchParams.get('regulation') || '';
  const initialYearSem = searchParams.get('year_sem') || '';

  if (!branchId) return <Navigate to="/student/login" replace />;

  const session = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('student_session') || 'null'); } catch { return null; }
  }, []);
  const collegeId: string | undefined = session?.college_id;

  const [selectedRegulation, setSelectedRegulation] = useState(initialRegulation);
  const [selectedSemester, setSelectedSemester] = useState(initialYearSem);

  const { data: subjects = [], isLoading } = useStudentSubjects(
    branchId,
    selectedRegulation || undefined,
    selectedSemester || undefined,
  );
  const { data: branches = [] } = useBranches();
  const { data: regulations = [] } = useRegulations();

  const filteredRegulations = useMemo(
    () => collegeId ? regulations.filter((r: any) => !r.college_id || r.college_id === collegeId) : regulations,
    [regulations, collegeId],
  );

  const branchName = branches.find(b => b.id === branchId)?.name || '';
  const regulationName = regulations.find(r => r.id === selectedRegulation)?.name || '';

  const handleLogout = () => {
    localStorage.removeItem('student_session');
    navigate('/');
  };

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
                <p className="text-xs text-muted-foreground">{branchName}{regulationName ? ` • ${regulationName}` : ''}{selectedSemester ? ` • ${selectedSemester}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />
                Student
              </Badge>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={selectedRegulation} onValueChange={setSelectedRegulation}>
            <SelectTrigger className="h-9 w-[170px] border-primary/40 bg-primary/5 text-sm font-medium text-foreground hover:bg-primary/10 focus:ring-primary">
              <SelectValue placeholder="Select Regulation" />
            </SelectTrigger>
            <SelectContent>
              {filteredRegulations.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No regulations</div>
              ) : (
                filteredRegulations.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="h-9 w-[150px] border-primary/40 bg-primary/5 text-sm font-medium text-foreground hover:bg-primary/10 focus:ring-primary">
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTERS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedRegulation || !selectedSemester ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Select regulation and semester</h3>
            <p className="text-muted-foreground">Choose your regulation and semester to view subjects.</p>
          </div>
        ) : (
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
                <p className="text-muted-foreground">Subjects will appear here once faculty adds them for your year/semester.</p>
              </div>
            ) : (
              subjects.map((subject) => {
                const regulation = regulations.find(r => r.id === subject.regulation_id);
                return (
                  <Link key={subject.id} to={`/student/subject/${subject.id}?branch=${branchId}&regulation=${selectedRegulation}&year_sem=${selectedSemester}`}>
                    <Card className="group hover:shadow-lg transition-all cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary">{subject.code}</Badge>
                          {regulation && <Badge variant="outline" className="text-xs">{regulation.name}</Badge>}
                          {(subject as any).year_sem && <Badge variant="outline" className="text-xs">{(subject as any).year_sem}</Badge>}
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
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
