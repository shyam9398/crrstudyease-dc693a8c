import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface College { id: string; name: string; }

const StudentLogin = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('student_session');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.user_id && d.branch_id) {
          navigate(`/student/dashboard?branch=${d.branch_id}&regulation=${d.regulation_id || ''}&year_sem=${d.year_sem || ''}`, { replace: true });
        }
      } catch {}
    }
    (async () => {
      const { data } = await supabase.from('colleges').select('id, name').order('name');
      setColleges((data as College[]) || []);
    })();
  }, [navigate]);

  const handleLogin = async () => {
    if (!collegeId || !userId.trim() || !password) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-login', {
        body: { collegeId, userId: userId.trim(), password },
      });
      if (error || !data?.success) {
        toast.error(data?.error || 'Invalid credentials');
        setLoading(false);
        return;
      }
      const s = data.student;
      localStorage.setItem('student_session', JSON.stringify(s));
      toast.success(`Welcome ${s.name || ''}!`);
      const qp = new URLSearchParams();
      if (s.branch_id) qp.set('branch', s.branch_id);
      if (s.regulation_id) qp.set('regulation', s.regulation_id);
      if (s.year_sem) qp.set('year_sem', s.year_sem);
      navigate(`/student/dashboard?${qp.toString()}`, { replace: true });
    } catch {
      toast.error('Login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center mb-3">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle>Student Login</CardTitle>
          <CardDescription>Sign in with credentials issued by your admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

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

          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Your Student ID" />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••" />
          </div>

          <Button className="w-full rounded-xl" onClick={handleLogin} disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>) : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
