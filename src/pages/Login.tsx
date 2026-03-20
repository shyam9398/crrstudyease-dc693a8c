import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches, useRegulations } from '@/hooks/useBranchesAndRegulations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Users, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import collegeLogo from '@/assets/college-logo.png';

type RoleSelection = 'admin' | 'faculty' | 'student' | null;

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();
  const { data: regulations = [], isLoading: regulationsLoading } = useRegulations();

  const [selectedRole, setSelectedRole] = useState<RoleSelection>(null);
  const [facultyCode, setFacultyCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin login state
  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBranch, setAdminBranch] = useState('');
  const [adminStep, setAdminStep] = useState<1 | 2>(1);

  // Student flow state
  const [studentStep, setStudentStep] = useState<1 | 2>(1);
  const [studentBranch, setStudentBranch] = useState('');
  const [studentRegulation, setStudentRegulation] = useState('');

  const handleFacultyLogin = async () => {
    if (!facultyCode || !password) {
      toast.error('Please enter Faculty Unique ID and password');
      return;
    }
    setLoading(true);
    // Convert faculty code to synthetic email for auth - trim whitespace
    const trimmedCode = facultyCode.trim();
    const syntheticEmail = `${trimmedCode.toLowerCase()}@faculty.studyease.local`;
    const { error } = await signIn(syntheticEmail, password);
    setLoading(false);
    if (error) {
      toast.error('Invalid Faculty ID or password');
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleAdminLogin = async () => {
    if (!adminUserId || !adminPassword) {
      toast.error('Please enter User ID and Password');
      return;
    }
    if (!adminBranch) {
      toast.error('Please select a branch first');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { userId: adminUserId, password: adminPassword, branchId: adminBranch },
      });
      if (error || !data?.success) {
        toast.error(data?.error || 'Invalid admin credentials for this branch');
      } else {
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_branch', adminBranch);
        if (data.isSuperAdmin) {
          sessionStorage.setItem('is_super_admin', 'true');
        } else {
          sessionStorage.removeItem('is_super_admin');
        }
        toast.success('Welcome, Admin!');
        navigate('/admin/dashboard');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    }
    setLoading(false);
  };

  const handleStudentBrowse = () => {
    if (studentStep === 1) {
      if (!studentBranch) {
        toast.error('Please select a branch');
        return;
      }
      setStudentStep(2);
    } else {
      if (!studentRegulation) {
        toast.error('Please select a regulation');
        return;
      }
      navigate(`/student/dashboard?branch=${studentBranch}&regulation=${studentRegulation}`);
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setFacultyCode('');
    setPassword('');
    setAdminUserId('');
    setAdminPassword('');
    setAdminBranch('');
    setAdminStep(1);
    setStudentStep(1);
    setStudentBranch('');
    setStudentRegulation('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* College Header */}
      <header className="w-full bg-card/80 backdrop-blur-sm border-b border-border/50 py-3 px-4">
        <div className="flex items-center justify-center gap-3 text-center">
          <img src={collegeLogo} alt="Sir C.R. Reddy College of Engineering Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain rounded-full bg-white p-1 shadow-sm" />
          <div>
            <h1 className="text-base md:text-lg font-bold text-foreground leading-tight tracking-tight">
              Sir C.R. Reddy College of Engineering
            </h1>
            <p className="text-xs md:text-sm font-semibold text-primary">(Autonomous)</p>
            <p className="text-[10px] md:text-xs text-muted-foreground leading-tight mt-0.5">
              Approved by AICTE | Affiliated to JNTUK | Accredited by NBA &amp; NAAC (A Grade)
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">StudyEase Platform</CardTitle>
            <CardDescription>Your academic learning companion</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection */}
            {!selectedRole && (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground mb-4">Select your role to continue</p>
                <div className="grid grid-cols-3 gap-3">
                  <Card
                    className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50"
                    onClick={() => setSelectedRole('admin')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Shield className="w-10 h-10 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Admin</h3>
                      <p className="text-[10px] text-muted-foreground text-center">Manage system</p>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50"
                    onClick={() => setSelectedRole('faculty')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Users className="w-10 h-10 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Faculty</h3>
                      <p className="text-[10px] text-muted-foreground text-center">Add & manage</p>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50"
                    onClick={() => setSelectedRole('student')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <GraduationCap className="w-10 h-10 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Student</h3>
                      <p className="text-[10px] text-muted-foreground text-center">View & learn</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Admin Login */}
            {selectedRole === 'admin' && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={adminStep === 2 ? () => setAdminStep(1) : handleBack} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="text-center mb-4">
                  <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-lg">
                    {adminStep === 1 ? 'Select Your Branch' : 'Admin Login'}
                  </h3>
                </div>
                {adminStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Select value={adminBranch} onValueChange={setAdminBranch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchesLoading ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => {
                      if (!adminBranch) {
                        toast.error('Please select a branch');
                        return;
                      }
                      setAdminStep(2);
                    }}>
                      Next
                    </Button>
                  </>
                )}
                {adminStep === 2 && (
                  <>
                    <p className="text-sm text-center text-muted-foreground">
                      Branch: {branches.find(b => b.id === adminBranch)?.name}
                    </p>
                    <div className="space-y-2">
                      <Label>User ID</Label>
                      <Input
                        placeholder="Enter admin user ID"
                        value={adminUserId}
                        onChange={(e) => setAdminUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleAdminLogin} disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In as Admin'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Faculty Login */}
            {selectedRole === 'faculty' && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="text-center mb-4">
                  <Users className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-lg">Faculty Login</h3>
                </div>
                <div className="space-y-2">
                  <Label>Faculty Unique ID</Label>
                  <Input
                    placeholder="Enter your Faculty Unique ID"
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleFacultyLogin} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            )}

            {/* Student Flow */}
            {selectedRole === 'student' && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={studentStep === 2 ? () => setStudentStep(1) : handleBack} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="text-center mb-4">
                  <GraduationCap className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-lg">
                    {studentStep === 1 ? 'Select Your Branch' : 'Select Your Regulation'}
                  </h3>
                </div>
                {studentStep === 1 && (
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={studentBranch} onValueChange={setStudentBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {studentStep === 2 && (
                  <div className="space-y-2">
                    <Label>Regulation</Label>
                    <Select value={studentRegulation} onValueChange={setStudentRegulation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your regulation" />
                      </SelectTrigger>
                      <SelectContent>
                        {regulationsLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : regulations.length === 0 ? (
                          <SelectItem value="none" disabled>No regulations available</SelectItem>
                        ) : (
                          regulations.map((reg) => (
                            <SelectItem key={reg.id} value={reg.id}>
                              {reg.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={handleStudentBrowse}>
                  {studentStep === 1 ? 'Next' : 'Browse Syllabus'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
