import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const YEAR_SEM_OPTIONS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

interface Branch { id: string; name: string; college_id: string | null; }
interface Regulation { id: string; name: string; }
interface College { id: string; name: string; }

const StudentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [userId, setUserId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [regulationId, setRegulationId] = useState('');
  const [yearSem, setYearSem] = useState('');
  const [loading, setLoading] = useState(false);

  const [colleges, setColleges] = useState<College[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('student_session');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.user_id && d.branch_id && d.regulation_id && d.year_sem) {
          navigate(`/student/dashboard?branch=${d.branch_id}&regulation=${d.regulation_id}&year_sem=${d.year_sem}`);
        }
      } catch {}
    }
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('colleges').select('id, name').order('name');
      setColleges((data as College[]) || []);
    })();
  }, []);

  useEffect(() => {
    if (!collegeId) { setBranches([]); return; }
    (async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, college_id')
        .eq('college_id', collegeId)
        .order('name');
      setBranches((data as Branch[]) || []);
    })();
  }, [collegeId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('regulations').select('id, name').order('name');
      setRegulations((data as Regulation[]) || []);
    })();
  }, []);

  const validateUserId = (id: string): string | null => {
    if (id.length !== 10) return 'User ID must be 10 characters';
    if (!/^[A-Za-z0-9]+$/.test(id)) return 'Only letters and numbers allowed';
    return null;
  };

  const handleContinue = async () => {
    const trimmed = userId.trim();
    if (!trimmed) { toast.error('Please enter your User ID'); return; }
    const err = validateUserId(trimmed);
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', trimmed)
        .maybeSingle();

      if (existing && existing.branch_id && existing.regulation_id && existing.year_sem) {
        localStorage.setItem('student_session', JSON.stringify(existing));
        toast.success('Welcome back!');
        navigate(`/student/dashboard?branch=${existing.branch_id}&regulation=${existing.regulation_id}&year_sem=${existing.year_sem}`);
        setLoading(false);
        return;
      }
      setStep(2);
    } catch {
      toast.error('Something went wrong.');
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!collegeId || !branchId || !regulationId || !yearSem) {
      toast.error('Please complete all selections');
      return;
    }
    setLoading(true);
    const trimmed = userId.trim();
    try {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', trimmed)
        .maybeSingle();

      const payload = {
        user_id: trimmed,
        college_id: collegeId,
        branch_id: branchId,
        regulation_id: regulationId,
        year_sem: yearSem,
      };

      if (existing) {
        await supabase
          .from('students')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('user_id', trimmed);
      } else {
        await supabase.from('students').insert(payload);
      }

      localStorage.setItem('student_session', JSON.stringify(payload));
      toast.success('Welcome!');
      navigate(`/student/dashboard?branch=${branchId}&regulation=${regulationId}&year_sem=${yearSem}`);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
    setLoading(false);
  };

  const back = () => {
    if (step === 1) navigate('/colleges');
    else setStep((step - 1) as any);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Student Login</CardTitle>
          <CardDescription>
            {step === 1 && 'Enter your unique User ID'}
            {step === 2 && 'Select your college'}
            {step === 3 && 'Select your branch'}
            {step === 4 && 'Select your regulation'}
            {step === 5 && 'Select year / semester'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="ghost" size="sm" onClick={back}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  placeholder="10-character User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                />
              </div>
              <Button className="w-full" onClick={handleContinue} disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </Button>
            </>
          )}

          {step === 2 && (
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
              <Button className="w-full" onClick={() => {
                if (!collegeId) { toast.error('Please select a college'); return; }
                setStep(3);
              }}>Next</Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select your branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.length === 0 ? (
                      <SelectItem value="none" disabled>No branches for this college</SelectItem>
                    ) : branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => {
                if (!branchId) { toast.error('Please select a branch'); return; }
                setStep(4);
              }}>Next</Button>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Regulation</Label>
                <Select value={regulationId} onValueChange={setRegulationId}>
                  <SelectTrigger><SelectValue placeholder="Select regulation" /></SelectTrigger>
                  <SelectContent>
                    {regulations.length === 0 ? (
                      <SelectItem value="none" disabled>No regulations available</SelectItem>
                    ) : regulations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => {
                if (!regulationId) { toast.error('Please select a regulation'); return; }
                setStep(5);
              }}>Next</Button>
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-2">
                <Label>Year / Semester</Label>
                <Select value={yearSem} onValueChange={setYearSem}>
                  <SelectTrigger><SelectValue placeholder="Select year-semester" /></SelectTrigger>
                  <SelectContent>
                    {YEAR_SEM_OPTIONS.map((ys) => (
                      <SelectItem key={ys} value={ys}>{ys}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleComplete} disabled={loading}>
                {loading ? 'Saving...' : 'Browse Syllabus'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
