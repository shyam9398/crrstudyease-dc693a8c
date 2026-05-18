import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, LogOut, Users, GitBranch, GraduationCap, Plus, Trash2, Pencil, Loader2, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Branch { id: string; name: string; created_at: string; }
interface Faculty { id: string; faculty_code: string; name: string; branch_id: string; created_at: string; }
interface Student { id: string; user_id: string; name: string | null; branch_id: string | null; created_at: string; }

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [collegeId, setCollegeId] = useState('');
  const [collegeName, setCollegeName] = useState('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Branch form
  const [branchForm, setBranchForm] = useState({ id: '', name: '' });
  const [branchBusy, setBranchBusy] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  // Faculty form
  const [facultyForm, setFacultyForm] = useState({ id: '', code: '', name: '', password: '', branchId: '' });
  const [facultyBusy, setFacultyBusy] = useState(false);
  const [deleteFaculty, setDeleteFaculty] = useState<Faculty | null>(null);

  // Student form
  const [studentForm, setStudentForm] = useState({ id: '', userId: '', name: '', password: '', branchId: '' });
  const [studentBusy, setStudentBusy] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const adminToken = () => sessionStorage.getItem('admin_token') || '';

  // Edge functions returning non-2xx leave the JSON body on error.context (a Response).
  // Pull it out so users see the real message (e.g. "Student ID already exists").
  const extractError = async (error: any, data: any, fallback = 'Failed'): Promise<string> => {
    if (data?.error) return data.error;
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.clone().json();
        if (body?.error) return body.error;
      }
    } catch { /* ignore */ }
    return error?.message || fallback;
  };

  const loadAll = useCallback(async () => {
    const token = adminToken();
    const cid = sessionStorage.getItem('admin_college') || '';
    const [br, st, fc] = await Promise.all([
      supabase.functions.invoke('manage-branches', { body: { adminToken: token, action: 'list' } }),
      supabase.functions.invoke('manage-students', { body: { adminToken: token, action: 'list' } }),
      supabase.functions.invoke('list-faculty', { body: { adminToken: token, collegeId: cid } }),
    ]);
    if (br.data?.success) setBranches(br.data.branches);
    if (st.data?.success) setStudents(st.data.students);
    if (fc.data?.success) setFaculty(fc.data.faculty);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    const cid = sessionStorage.getItem('admin_college');
    if (!token || !cid) {
      navigate('/', { replace: true });
      return;
    }
    setCollegeId(cid);
    setAuthorized(true);
    (async () => {
      const { data } = await supabase.from('colleges').select('name').eq('id', cid).maybeSingle();
      if (data) setCollegeName((data as any).name);
    })();
    loadAll();
  }, [navigate, loadAll]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_college');
    sessionStorage.removeItem('admin_branch');
    sessionStorage.removeItem('is_super_admin');
    navigate('/', { replace: true });
  };

  // ---------- Branches ----------
  const submitBranch = async () => {
    if (!branchForm.name.trim()) { toast.error('Branch name required'); return; }
    setBranchBusy(true);
    const action = branchForm.id ? 'update' : 'create';
    const { data, error } = await supabase.functions.invoke('manage-branches', {
      body: { adminToken: adminToken(), action, branchId: branchForm.id || undefined, name: branchForm.name.trim() },
    });
    setBranchBusy(false);
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    toast.success(branchForm.id ? 'Branch updated' : 'Branch created');
    setBranchForm({ id: '', name: '' });
    loadAll();
  };

  const confirmDeleteBranch = async () => {
    if (!deleteBranch) return;
    const { data, error } = await supabase.functions.invoke('manage-branches', {
      body: { adminToken: adminToken(), action: 'delete', branchId: deleteBranch.id },
    });
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    toast.success('Branch deleted');
    setDeleteBranch(null);
    loadAll();
  };

  // ---------- Faculty ----------
  const submitFaculty = async () => {
    if (!facultyForm.code || !facultyForm.password || !facultyForm.branchId) {
      toast.error('All fields required'); return;
    }
    if (facultyForm.password.length < 6) { toast.error('Password too short'); return; }
    setFacultyBusy(true);
    const { data, error } = await supabase.functions.invoke('create-faculty', {
      body: {
        adminToken: adminToken(),
        facultyCode: facultyForm.code.toUpperCase(),
        password: facultyForm.password,
        branchId: facultyForm.branchId,
      },
    });
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); setFacultyBusy(false); return; }
    // Set name separately via edit-faculty if provided
    if (facultyForm.name.trim()) {
      await supabase.functions.invoke('edit-faculty', {
        body: { adminToken: adminToken(), facultyUserId: data.userId, name: facultyForm.name.trim() },
      });
    }
    setFacultyBusy(false);
    toast.success('Faculty created');
    setFacultyForm({ id: '', code: '', name: '', password: '', branchId: '' });
    loadAll();
  };

  const confirmDeleteFaculty = async () => {
    if (!deleteFaculty) return;
    const { data, error } = await supabase.functions.invoke('delete-faculty', {
      body: { adminToken: adminToken(), facultyUserId: deleteFaculty.id },
    });
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    toast.success('Faculty deleted');
    setDeleteFaculty(null);
    loadAll();
  };

  // ---------- Students ----------
  const submitStudent = async () => {
    if (!studentForm.userId || !studentForm.name || !studentForm.branchId ||
        (!studentForm.id && !studentForm.password)) {
      toast.error('All fields required'); return;
    }
    setStudentBusy(true);
    const action = studentForm.id ? 'update' : 'create';
    const body: any = { adminToken: adminToken(), action, branchId: studentForm.branchId };
    if (studentForm.id) {
      body.studentId = studentForm.id;
      body.name = studentForm.name;
      if (studentForm.password) body.password = studentForm.password;
    } else {
      body.userId = studentForm.userId;
      body.name = studentForm.name;
      body.password = studentForm.password;
    }
    const { data, error } = await supabase.functions.invoke('manage-students', { body });
    setStudentBusy(false);
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    toast.success(studentForm.id ? 'Student updated' : 'Student created');
    setStudentForm({ id: '', userId: '', name: '', password: '', branchId: '' });
    loadAll();
  };

  const confirmDeleteStudent = async () => {
    if (!deleteStudent) return;
    const { data, error } = await supabase.functions.invoke('manage-students', {
      body: { adminToken: adminToken(), action: 'delete', studentId: deleteStudent.id },
    });
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    toast.success('Student deleted');
    setDeleteStudent(null);
    loadAll();
  };

  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name || '—';

  if (!authorized) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground truncate">{collegeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">Admin</Badge>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={loadAll}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Branches</CardTitle>
              <GitBranch className="w-5 h-5 text-primary-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{branches.length}</p></CardContent>
          </Card>
          <Card className="glass-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Faculty</CardTitle>
              <Users className="w-5 h-5 text-primary-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{faculty.length}</p></CardContent>
          </Card>
          <Card className="glass-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">Students</CardTitle>
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{students.length}</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="branches" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* BRANCHES */}
          <TabsContent value="branches" className="space-y-4 mt-4">
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{branchForm.id ? 'Edit Branch' : 'Create Branch'}</CardTitle>
                <CardDescription>Examples: CSE, ECE, AIML, EEE, Mechanical</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Input placeholder="Branch name (e.g. CSE)" value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
                  <div className="flex gap-2">
                    <Button onClick={submitBranch} disabled={branchBusy} className="rounded-xl">
                      {branchBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      {branchForm.id ? 'Update' : 'Add'}
                    </Button>
                    {branchForm.id && (
                      <Button variant="ghost" onClick={() => setBranchForm({ id: '', name: '' })}>Cancel</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="pt-4">
                {branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No branches yet. Add your first one.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {branches.map((b) => (
                      <li key={b.id} className="flex items-center justify-between py-3">
                        <span className="font-medium">{b.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setBranchForm({ id: b.id, name: b.name })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setDeleteBranch(b)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FACULTY */}
          <TabsContent value="faculty" className="space-y-4 mt-4">
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Create Faculty</CardTitle>
                <CardDescription>Faculty will access content of their assigned branch only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Faculty ID</Label>
                    <Input placeholder="e.g. FAC001"
                      value={facultyForm.code}
                      onChange={(e) => setFacultyForm({ ...facultyForm, code: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Faculty Name</Label>
                    <Input placeholder="Full name"
                      value={facultyForm.name}
                      onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Min 6 chars"
                      value={facultyForm.password}
                      onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Branch</Label>
                    <Select value={facultyForm.branchId} onValueChange={(v) => setFacultyForm({ ...facultyForm, branchId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.length === 0
                          ? <SelectItem value="_" disabled>Add a branch first</SelectItem>
                          : branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={submitFaculty} disabled={facultyBusy} className="rounded-xl">
                  {facultyBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Create Faculty
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="pt-4">
                {faculty.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No faculty accounts yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {faculty.map((f) => (
                      <li key={f.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{f.name || f.faculty_code}</p>
                          <p className="text-xs text-muted-foreground">{f.faculty_code} · {branchName(f.branch_id)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setDeleteFaculty(f)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{studentForm.id ? 'Edit Student' : 'Create Student'}</CardTitle>
                <CardDescription>Students can only log in with credentials you create here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Student ID</Label>
                    <Input placeholder="e.g. 23B81A0501" disabled={!!studentForm.id}
                      value={studentForm.userId}
                      onChange={(e) => setStudentForm({ ...studentForm, userId: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Student Name</Label>
                    <Input placeholder="Full name"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{studentForm.id ? 'New Password (optional)' : 'Password'}</Label>
                    <Input type="password" placeholder="Min 6 chars"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Branch</Label>
                    <Select value={studentForm.branchId} onValueChange={(v) => setStudentForm({ ...studentForm, branchId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.length === 0
                          ? <SelectItem value="_" disabled>Add a branch first</SelectItem>
                          : branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={submitStudent} disabled={studentBusy} className="rounded-xl">
                    {studentBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    {studentForm.id ? 'Update' : 'Create Student'}
                  </Button>
                  {studentForm.id && (
                    <Button variant="ghost" onClick={() => setStudentForm({ id: '', userId: '', name: '', password: '', branchId: '' })}>Cancel</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="pt-4">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No students yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {students.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{s.name || s.user_id}</p>
                          <p className="text-xs text-muted-foreground">{s.user_id} · {branchName(s.branch_id)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setStudentForm({ id: s.id, userId: s.user_id, name: s.name || '', password: '', branchId: s.branch_id || '' })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setDeleteStudent(s)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteBranch} onOpenChange={(o) => !o && setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteBranch?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBranch}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFaculty} onOpenChange={(o) => !o && setDeleteFaculty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete faculty?</AlertDialogTitle>
            <AlertDialogDescription>This removes "{deleteFaculty?.name || deleteFaculty?.faculty_code}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFaculty}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteStudent} onOpenChange={(o) => !o && setDeleteStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>This removes "{deleteStudent?.name || deleteStudent?.user_id}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStudent}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
