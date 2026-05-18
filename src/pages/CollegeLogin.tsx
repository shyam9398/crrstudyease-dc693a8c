import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Shield, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface College { id: string; name: string; logo_url: string | null; }

type Role = 'admin' | 'faculty' | null;

const CollegeLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [collegeSelected, setCollegeSelected] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const [adminUserId, setAdminUserId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [facultyCode, setFacultyCode] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('colleges').select('id, name, logo_url').order('name');
      setColleges((data as College[]) || []);
    })();
  }, []);

  const selectedCollege = colleges.find((c) => c.id === collegeId);

  const proceedFromCollege = () => {
    if (!collegeId) { toast.error('Please select your college'); return; }
    localStorage.setItem('active_college_id', collegeId);
    setCollegeSelected(true);
  };

  const handleAdminLogin = async () => {
    if (!adminUserId || !adminPassword) { toast.error('Enter User ID and Password'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { userId: adminUserId, password: adminPassword, collegeId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || 'Invalid admin credentials');
      } else {
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_college', collegeId);
        if (data.branchId) sessionStorage.setItem('admin_branch', data.branchId);
        else sessionStorage.removeItem('admin_branch');
        if (data.isSuperAdmin) sessionStorage.setItem('is_super_admin', 'true');
        else sessionStorage.removeItem('is_super_admin');
        toast.success('Welcome, Admin!');
        navigate('/admin/dashboard', { replace: true });
      }
    } catch {
      toast.error('Login failed.');
    }
    setLoading(false);
  };

  const handleFacultyLogin = async () => {
    if (!facultyCode || !password) { toast.error('Enter Faculty ID and password'); return; }
    setLoading(true);
    const synthetic = `${facultyCode.trim().toLowerCase()}@faculty.studyease.local`;
    const { error } = await signIn(synthetic, password);
    if (error) {
      toast.error('Invalid Faculty ID or password');
      setLoading(false);
      return;
    }
    // verify faculty belongs to this college
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('college_id').eq('id', user.id).maybeSingle();
      if (profile && profile.college_id && profile.college_id !== collegeId) {
        await supabase.auth.signOut();
        toast.error('This faculty is not assigned to the selected college');
        setLoading(false);
        return;
      }
    }
    toast.success('Welcome back!');
    navigate('/dashboard', { replace: true });
    setLoading(false);
  };

  const handleBack = () => {
    if (role) { setRole(null); return; }
    if (collegeSelected) { setCollegeSelected(false); return; }
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {selectedCollege && collegeSelected && (
        <header className="w-full bg-card/70 backdrop-blur-xl border-b border-border/60 py-3 px-4">
          <div className="flex items-center justify-center gap-3 text-center">
            {selectedCollege.logo_url && (
              <img src={selectedCollege.logo_url} alt={selectedCollege.name}
                className="w-12 h-12 object-contain rounded-full bg-white p-1 shadow-sm" />
            )}
            <h1 className="text-base md:text-lg font-bold leading-tight">{selectedCollege.name}</h1>
          </div>
        </header>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle>College Login</CardTitle>
            <CardDescription>
              {!collegeSelected ? 'Select your college to continue' :
               !role ? 'Choose your role' :
               role === 'admin' ? 'Admin Login' : 'Faculty Login'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            {!collegeSelected && (
              <>
                <div className="space-y-2">
                  <Label>College</Label>
                  <Select value={collegeId} onValueChange={setCollegeId}>
                    <SelectTrigger><SelectValue placeholder="Select your college" /></SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" onClick={proceedFromCollege}>Next</Button>
              </>
            )}

            {collegeSelected && !role && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition" onClick={() => setRole('admin')}>
                  <CardContent className="flex flex-col items-center p-5">
                    <Shield className="w-9 h-9 text-primary-foreground mb-2" />
                    <h3 className="font-semibold text-sm">Admin</h3>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition" onClick={() => setRole('faculty')}>
                  <CardContent className="flex flex-col items-center p-5">
                    <Users className="w-9 h-9 text-primary-foreground mb-2" />
                    <h3 className="font-semibold text-sm">Faculty</h3>
                  </CardContent>
                </Card>
              </div>
            )}

            {role === 'admin' && (
              <>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} placeholder="Admin User ID" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button className="w-full rounded-xl" onClick={handleAdminLogin} disabled={loading}>
                  {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>) : 'Sign In as Admin'}
                </Button>
              </>
            )}

            {role === 'faculty' && (
              <>
                <div className="space-y-2">
                  <Label>Faculty Unique ID</Label>
                  <Input value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value.toUpperCase())} placeholder="Faculty Unique ID" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button className="w-full rounded-xl" onClick={handleFacultyLogin} disabled={loading}>
                  {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>) : 'Sign In'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollegeLogin;
