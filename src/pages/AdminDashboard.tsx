import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, LogOut, Users, BookOpen, GitBranch, FileText, Plus, Eye, EyeOff, Trash2, RefreshCw, Pencil, Crown } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBranches, useRegulations } from '@/hooks/useBranchesAndRegulations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import collegeLogo from '@/assets/college-logo.png';

interface FacultyEntry {
  id: string;
  faculty_code: string;
  branch_id: string;
  name: string;
  created_at: string;
}

interface BranchAdmin {
  id: string;
  branch_id: string;
  branch_name: string;
  user_id_credential: string;
  is_super_admin: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminBranchId, setAdminBranchId] = useState('');
  const { data: branches = [] } = useBranches();
  const { data: regulations = [] } = useRegulations();
  const [subjectCount, setSubjectCount] = useState(0);
  const [facultyList, setFacultyList] = useState<FacultyEntry[]>([]);

  // Create faculty form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFacultyCode, setNewFacultyCode] = useState('');
  const [newFacultyPassword, setNewFacultyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FacultyEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit faculty
  const [editTarget, setEditTarget] = useState<FacultyEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editing, setEditing] = useState(false);

  // Super Admin: Branch admin management
  const [branchAdmins, setBranchAdmins] = useState<BranchAdmin[]>([]);
  const [showCreateBranchAdmin, setShowCreateBranchAdmin] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<BranchAdmin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  const branchName = branches.find(b => b.id === adminBranchId)?.name || 'Unknown Branch';

  const fetchData = async (branchId: string) => {
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('list-faculty', {
        body: { adminToken, branchId },
      });

      if (error) {
        let msg = 'Failed to load dashboard data';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        console.error('Fetch error:', msg);
        return;
      }

      if (data?.success) {
        setSubjectCount(data.subjectCount || 0);
        setFacultyList(data.faculty || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const fetchBranchAdmins = async () => {
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('manage-branch-admins', {
        body: { adminToken, action: 'list' },
      });

      if (error) {
        console.error('Failed to fetch branch admins');
        return;
      }

      if (data?.success) {
        setBranchAdmins(data.admins || []);
      }
    } catch (err) {
      console.error('Failed to fetch branch admins:', err);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    const branchId = sessionStorage.getItem('admin_branch');
    const superAdmin = sessionStorage.getItem('is_super_admin') === 'true';
    if (!token || !branchId) {
      navigate('/', { replace: true });
      return;
    }
    setAdminBranchId(branchId);
    setIsSuperAdmin(superAdmin);
    setIsAuthorized(true);
    fetchData(branchId);
    if (superAdmin) {
      fetchBranchAdmins();
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_branch');
    sessionStorage.removeItem('is_super_admin');
    navigate('/', { replace: true });
  };

  const handleCreateFaculty = async () => {
    if (!newFacultyCode || !newFacultyPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newFacultyPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('create-faculty', {
        body: {
          adminToken,
          facultyCode: newFacultyCode.toUpperCase(),
          password: newFacultyPassword,
          branchId: adminBranchId,
        },
      });

      if (error) {
        let msg = 'Failed to create faculty account';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore parse errors */ }
        toast.error(msg);
      } else if (!data?.success) {
        toast.error(data?.error || 'Failed to create faculty account');
      } else {
        toast.success('Faculty account created successfully!');
        setNewFacultyCode('');
        setNewFacultyPassword('');
        setShowCreateForm(false);
        fetchData(adminBranchId);
      }
    } catch {
      toast.error('Failed to create faculty account');
    }
    setCreating(false);
  };

  const handleDeleteFaculty = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('delete-faculty', {
        body: { adminToken, facultyUserId: deleteTarget.id },
      });

      if (error) {
        let msg = 'Failed to delete faculty account';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        toast.error(msg);
      } else if (!data?.success) {
        toast.error(data?.error || 'Failed to delete faculty account');
      } else {
        toast.success('Faculty account deleted successfully');
        setDeleteTarget(null);
        fetchData(adminBranchId);
      }
    } catch {
      toast.error('Failed to delete faculty account');
    }
    setDeleting(false);
  };

  const openEditDialog = (faculty: FacultyEntry) => {
    setEditTarget(faculty);
    setEditName(faculty.name || '');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleEditFaculty = async () => {
    if (!editTarget) return;
    if (!editName.trim() && !editPassword) {
      toast.error('Please provide a name or new password');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setEditing(true);
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('edit-faculty', {
        body: {
          adminToken,
          facultyUserId: editTarget.id,
          ...(editName.trim() ? { name: editName.trim() } : {}),
          ...(editPassword ? { password: editPassword } : {}),
        },
      });

      if (error) {
        let msg = 'Failed to update faculty';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        toast.error(msg);
      } else if (!data?.success) {
        toast.error(data?.error || 'Failed to update faculty');
      } else {
        toast.success('Faculty updated successfully');
        setEditTarget(null);
        fetchData(adminBranchId);
      }
    } catch {
      toast.error('Failed to update faculty');
    }
    setEditing(false);
  };

  const handleCreateBranchAdmin = async () => {
    if (!newBranchName || !newAdminUserId || !newAdminPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreatingAdmin(true);
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('manage-branch-admins', {
        body: {
          adminToken,
          action: 'create_branch_admin',
          branchName: newBranchName,
          userIdCredential: newAdminUserId,
          passwordCredential: newAdminPassword,
        },
      });

      if (error) {
        let msg = 'Failed to create branch admin';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        toast.error(msg);
      } else if (!data?.success) {
        toast.error(data?.error || 'Failed to create branch admin');
      } else {
        toast.success('Branch admin created successfully!');
        setNewBranchName('');
        setNewAdminUserId('');
        setNewAdminPassword('');
        setShowCreateBranchAdmin(false);
        fetchBranchAdmins();
      }
    } catch {
      toast.error('Failed to create branch admin');
    }
    setCreatingAdmin(false);
  };

  const handleDeleteBranchAdmin = async () => {
    if (!deleteAdminTarget) return;
    setDeletingAdmin(true);
    try {
      const adminToken = sessionStorage.getItem('admin_token');
      const { data, error } = await supabase.functions.invoke('manage-branch-admins', {
        body: {
          adminToken,
          action: 'delete',
          branchAdminId: deleteAdminTarget.id,
        },
      });

      if (error) {
        let msg = 'Failed to delete branch admin';
        try {
          const ctx = error.context ? await error.context.json() : null;
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        toast.error(msg);
      } else if (!data?.success) {
        toast.error(data?.error || 'Failed to delete branch admin');
      } else {
        toast.success('Branch admin deleted successfully');
        setDeleteAdminTarget(null);
        fetchBranchAdmins();
      }
    } catch {
      toast.error('Failed to delete branch admin');
    }
    setDeletingAdmin(false);
  };

  if (!isAuthorized) return null;

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
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {isSuperAdmin ? <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> : <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
                </h1>
                <p className="text-xs text-muted-foreground">{branchName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {isSuperAdmin ? <Crown className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </Badge>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { fetchData(adminBranchId); if (isSuperAdmin) fetchBranchAdmins(); }} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <ThemeToggle />
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Branch Regulations</CardTitle>
              <FileText className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{regulations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Branch Subjects</CardTitle>
              <BookOpen className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{subjectCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Branch Faculty</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{facultyList.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin: Branch Admin Management */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Branch Admin Management
                  </CardTitle>
                  <CardDescription>Create and manage admin accounts for all branches</CardDescription>
                </div>
                <Button onClick={() => setShowCreateBranchAdmin(!showCreateBranchAdmin)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Branch Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {showCreateBranchAdmin && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Branch Name</Label>
                        <Input
                          placeholder="e.g. New Department"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Admin User ID</Label>
                        <Input
                          placeholder="e.g. DEPT1989"
                          value={newAdminUserId}
                          onChange={(e) => setNewAdminUserId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Admin Password</Label>
                        <div className="relative">
                          <Input
                            type={showNewAdminPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                          >
                            {showNewAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowCreateBranchAdmin(false)}>Cancel</Button>
                      <Button onClick={handleCreateBranchAdmin} disabled={creatingAdmin}>
                        {creatingAdmin ? 'Creating...' : 'Create Branch Admin'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {branchAdmins.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-medium text-muted-foreground">Branch</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">User ID</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchAdmins.map((admin) => (
                          <tr key={admin.id} className="border-b last:border-0">
                            <td className="p-3">{admin.branch_name}</td>
                            <td className="p-3 font-mono text-xs">{admin.user_id_credential}</td>
                            <td className="p-3">
                              {admin.is_super_admin ? (
                                <Badge variant="default" className="text-xs"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Branch Admin</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {!admin.is_super_admin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteAdminTarget(admin)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Loading branch admins...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Faculty Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Faculty Management — {branchName}</CardTitle>
                <CardDescription>Create and manage faculty login accounts for this branch</CardDescription>
              </div>
              <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Create Faculty
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showCreateForm && (
              <Card className="border-dashed">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Faculty Unique ID</Label>
                      <Input
                        placeholder="e.g. 2023ENG110200040"
                        value={newFacultyCode}
                        onChange={(e) => setNewFacultyCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={newFacultyPassword}
                          onChange={(e) => setNewFacultyPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Branch: <strong>{branchName}</strong> (auto-assigned)</p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                    <Button onClick={handleCreateFaculty} disabled={creating}>
                      {creating ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {facultyList.length > 0 ? (
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium text-muted-foreground">Faculty ID</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Created</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyList.map((faculty) => (
                        <tr key={faculty.id} className="border-b last:border-0">
                          <td className="p-3 font-mono text-xs">{faculty.faculty_code}</td>
                          <td className="p-3">{faculty.name || '—'}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(faculty.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openEditDialog(faculty)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(faculty)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No faculty accounts created yet.</p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Faculty Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the faculty account <strong>{deleteTarget?.faculty_code}</strong>? This action cannot be undone and will remove all their login access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFaculty}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Faculty Dialog */}
      <AlertDialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Faculty — {editTarget?.faculty_code}</AlertDialogTitle>
            <AlertDialogDescription>
              Update the faculty name or reset their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Faculty name" />
            </div>
            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditFaculty} disabled={editing}>
              {editing ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Branch Admin Confirmation Dialog */}
      <AlertDialog open={!!deleteAdminTarget} onOpenChange={(open) => !open && setDeleteAdminTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin for <strong>{deleteAdminTarget?.branch_name}</strong> ({deleteAdminTarget?.user_id_credential})? This will remove their admin access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAdmin}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranchAdmin}
              disabled={deletingAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAdmin ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
