import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches, useRegulations, useCreateRegulation, useUpdateRegulation, useDeleteRegulation } from '@/hooks/useBranchesAndRegulations';
import { useAllBranchSubjects, useSubjectCreators, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/hooks/useSubjects';
import { useReceivedRequests, useSentRequests, useCreateUpdateRequest, useRespondToRequest } from '@/hooks/useUpdateRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Plus,
  LogOut,
  GraduationCap,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Filter,
  Send,
  Bell,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import collegeLogo from '@/assets/college-logo.png';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { profile, role, signOut, isFaculty, user } = useAuth();
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [facultyDisplayName, setFacultyDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const { data: branches = [] } = useBranches();
  const { data: regulations = [], isLoading: regulationsLoading } = useRegulations();
  const createRegulation = useCreateRegulation();
  const updateRegulation = useUpdateRegulation();
  const deleteRegulation = useDeleteRegulation();

  // Selected regulation for filtering (faculty) or auto-set (student)
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');
  const filterRegulation = isFaculty 
    ? (selectedRegulation === 'all' ? undefined : selectedRegulation)
    : profile?.regulation_id || undefined;

  // Faculty sees ALL subjects in branch; students see own branch subjects
  const { data: allSubjects = [], isLoading: subjectsLoading } = useAllBranchSubjects(filterRegulation);
  const subjects = allSubjects;
  
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  
  // Update requests
  const { data: receivedRequests = [] } = useReceivedRequests();
  const { data: sentRequests = [] } = useSentRequests();
  const createUpdateRequest = useCreateUpdateRequest();
  const respondToRequest = useRespondToRequest();

  // Get creator names for subjects + request participants
  const creatorIds = [
    ...subjects.map(s => s.created_by),
    ...sentRequests.map(r => r.owner_id),
    ...receivedRequests.map(r => r.requester_id),
  ];
  const { data: creatorNames = {} } = useSubjectCreators(creatorIds);

  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isRegulationDialogOpen, setIsRegulationDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditRegulationDialogOpen, setIsEditRegulationDialogOpen] = useState(false);
  const [deleteRegulationDialogOpen, setDeleteRegulationDialogOpen] = useState(false);
  const [selectedRegulationForAction, setSelectedRegulationForAction] = useState<string | null>(null);
  const [selectedSubjectForAction, setSelectedSubjectForAction] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestSubject, setRequestSubject] = useState<typeof subjects[0] | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Form states
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectRegulation, setNewSubjectRegulation] = useState('');
  const [newSubjectYearSem, setNewSubjectYearSem] = useState('');
  const [newRegulationName, setNewRegulationName] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectCode, setEditSubjectCode] = useState('');
  const [editRegulationName, setEditRegulationName] = useState('');

  const branchName = branches.find(b => b.id === profile?.branch_id)?.name || 'Unknown Branch';
  const regulationName = regulations.find(r => r.id === profile?.regulation_id)?.name;

  // Check if faculty needs to set their name on first login
  useEffect(() => {
    if (isFaculty && profile) {
      // If name equals faculty_code, they haven't set a real name yet
      const profileAny = profile as any;
      const facultyCode = profileAny.faculty_code;
      if (facultyCode && profile.name === facultyCode) {
        setShowNamePrompt(true);
      }
    }
  }, [isFaculty, profile]);

  const handleSaveName = async () => {
    if (!facultyDisplayName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: facultyDisplayName.trim() })
      .eq('id', user?.id);
    if (error) {
      toast.error('Failed to save name');
    } else {
      toast.success('Name saved successfully!');
      setShowNamePrompt(false);
      // Refresh page to update profile
      window.location.reload();
    }
    setSavingName(false);
  };

  const handleAddSubject = async () => {
    if (newSubjectName.trim() && newSubjectCode.trim() && newSubjectRegulation && newSubjectYearSem) {
      // Check for duplicate subject code
      const existingSubject = subjects.find(s => s.code.toLowerCase() === newSubjectCode.trim().toLowerCase());
      if (existingSubject) {
        toast.error(`Subject code "${newSubjectCode}" already exists for "${existingSubject.name}". One code = one subject.`);
        return;
      }
      try {
        await createSubject.mutateAsync({
          name: newSubjectName,
          code: newSubjectCode,
          regulationId: newSubjectRegulation,
          yearSem: newSubjectYearSem,
        });
        setNewSubjectName('');
        setNewSubjectCode('');
        setNewSubjectRegulation('');
        setNewSubjectYearSem('');
        setIsSubjectDialogOpen(false);
      } catch {
        // Error already shown by mutation
      }
    } else {
      toast.error('Please fill all fields including Year/Semester');
    }
  };

  const handleAddRegulation = async () => {
    if (newRegulationName.trim()) {
      await createRegulation.mutateAsync(newRegulationName);
      setNewRegulationName('');
      setIsRegulationDialogOpen(false);
    }
  };

  const handleEditSubject = async () => {
    if (selectedSubjectForAction && editSubjectName.trim() && editSubjectCode.trim()) {
      await updateSubject.mutateAsync({
        id: selectedSubjectForAction,
        name: editSubjectName,
        code: editSubjectCode,
      });
      setIsEditDialogOpen(false);
      setSelectedSubjectForAction(null);
    }
  };

  const handleDeleteSubject = async () => {
    if (selectedSubjectForAction) {
      await deleteSubject.mutateAsync(selectedSubjectForAction);
      setDeleteDialogOpen(false);
      setSelectedSubjectForAction(null);
    }
  };

  const openEditDialog = (subject: typeof subjects[0]) => {
    setSelectedSubjectForAction(subject.id);
    setEditSubjectName(subject.name);
    setEditSubjectCode(subject.code);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (subjectId: string) => {
    setSelectedSubjectForAction(subjectId);
    setDeleteDialogOpen(true);
  };

  const canEditSubject = (subject: typeof subjects[0]) => {
    return isFaculty && subject.created_by === user?.id;
  };

  const openRequestDialog = (subject: typeof subjects[0]) => {
    setRequestSubject(subject);
    setRequestMessage('');
    setIsRequestDialogOpen(true);
  };

  const handleSendRequest = async () => {
    if (requestSubject && requestMessage.trim()) {
      await createUpdateRequest.mutateAsync({
        subjectId: requestSubject.id,
        ownerId: requestSubject.created_by,
        message: requestMessage,
      });
      setIsRequestDialogOpen(false);
      setRequestSubject(null);
      setRequestMessage('');
    }
  };

  const handleRespondToRequest = async (requestId: string, reply: string) => {
    await respondToRequest.mutateAsync({ id: requestId, reply });
  };

  const canEditRegulation = (regulation: typeof regulations[0]) => {
    return isFaculty && regulation.created_by === user?.id;
  };

  const openEditRegulationDialog = (regulation: typeof regulations[0]) => {
    setSelectedRegulationForAction(regulation.id);
    setEditRegulationName(regulation.name);
    setIsEditRegulationDialogOpen(true);
  };

  const handleEditRegulation = async () => {
    if (selectedRegulationForAction && editRegulationName.trim()) {
      await updateRegulation.mutateAsync({
        id: selectedRegulationForAction,
        name: editRegulationName,
      });
      setIsEditRegulationDialogOpen(false);
      setSelectedRegulationForAction(null);
    }
  };

  const handleDeleteRegulation = async () => {
    if (selectedRegulationForAction) {
      await deleteRegulation.mutateAsync(selectedRegulationForAction);
      setDeleteRegulationDialogOpen(false);
      setSelectedRegulationForAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* College branding row */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={collegeLogo} alt="Sir C.R. Reddy College of Engineering Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full bg-white p-0.5 shadow-sm" />
            <div className="text-center">
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight tracking-tight">
                Sir C.R. Reddy College of Engineering
              </h2>
              <p className="text-[10px] sm:text-xs text-primary font-semibold">(Autonomous)</p>
            </div>
          </div>
          {/* Nav row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">StudyEase</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{branchName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.name || 'User'}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Badge variant={isFaculty ? 'default' : 'secondary'} className="text-xs">
                    {isFaculty ? <Users className="w-3 h-3 mr-1" /> : <GraduationCap className="w-3 h-3 mr-1" />}
                    {role}
                  </Badge>
                  {regulationName && (
                    <Badge variant="outline" className="text-xs">{regulationName}</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => queryClient.invalidateQueries()} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <ThemeToggle />
              {isFaculty && (
                <Button variant="outline" size="icon" className="relative" onClick={() => setShowRequests(!showRequests)}>
                  <Bell className="w-4 h-4" />
                  {receivedRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {receivedRequests.length}
                    </span>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Faculty Actions */}
        {isFaculty && (
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
            {/* Add Subject */}
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                  <DialogDescription>Create a new subject for your branch</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject Name</Label>
                    <Input
                      placeholder="e.g., Data Structures"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Code</Label>
                    <Input
                      placeholder="e.g., CS201"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Regulation</Label>
                    <Select value={newSubjectRegulation} onValueChange={setNewSubjectRegulation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select regulation" />
                      </SelectTrigger>
                      <SelectContent>
                        {regulations.map((reg) => (
                          <SelectItem key={reg.id} value={reg.id}>
                            {reg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year / Semester</Label>
                    <Select value={newSubjectYearSem} onValueChange={setNewSubjectYearSem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year-semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'].map((ys) => (
                          <SelectItem key={ys} value={ys}>{ys}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full"
                    disabled={createSubject.isPending}
                  >
                    {createSubject.isPending ? 'Creating...' : 'Add Subject'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Regulation */}
            <Dialog open={isRegulationDialogOpen} onOpenChange={setIsRegulationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Regulation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Regulation</DialogTitle>
                  <DialogDescription>Create a new academic regulation</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Regulation Name</Label>
                    <Input
                      placeholder="e.g., R23 (2023-2027)"
                      value={newRegulationName}
                      onChange={(e) => setNewRegulationName(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAddRegulation} 
                    className="w-full"
                    disabled={createRegulation.isPending}
                  >
                    {createRegulation.isPending ? 'Creating...' : 'Add Regulation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Filter by Regulation */}
            <Select value={selectedRegulation} onValueChange={setSelectedRegulation}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by regulation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regulations</SelectItem>
                {regulations.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Regulations Management Section - Faculty Only */}
        {isFaculty && regulations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Regulations</h2>
            <div className="flex flex-wrap gap-2">
              {regulations.filter(reg => canEditRegulation(reg)).map((reg) => (
                <Badge key={reg.id} variant="secondary" className="flex items-center gap-2 py-2 px-3">
                  {reg.name}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditRegulationDialog(reg)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedRegulationForAction(reg.id);
                          setDeleteRegulationDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))
          ) : subjects.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No subjects yet</h3>
              <p className="text-muted-foreground">
                {isFaculty 
                  ? 'Start by adding your first subject.' 
                  : 'Subjects will appear here once faculty adds them.'}
              </p>
            </div>
          ) : (
            subjects.map((subject) => {
              const regulation = regulations.find(r => r.id === subject.regulation_id);
              const isOwner = subject.created_by === user?.id;
              const creatorName = creatorNames[subject.created_by] || 'Unknown';
              
              return (
                <Card key={subject.id} className="group hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{subject.code}</Badge>
                          {regulation && (
                            <Badge variant="outline" className="text-xs">{regulation.name}</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        {isFaculty && !isOwner && (
                          <p className="text-xs text-muted-foreground mt-1">Created by: {creatorName}</p>
                        )}
                      </div>
                      {canEditSubject(subject) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(subject.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : isFaculty && !isOwner ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openRequestDialog(subject)}>
                          <Send className="w-3 h-3" />
                          <span className="hidden sm:inline">Request Update</span>
                        </Button>
                      ) : null}
                    </div>
                    <CardDescription>Click to view units and modules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`/subject/${subject.id}`}>
                      <Button variant="outline" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Subject
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Code</Label>
              <Input
                value={editSubjectCode}
                onChange={(e) => setEditSubjectCode(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleEditSubject} 
              className="w-full"
              disabled={updateSubject.isPending}
            >
              {updateSubject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subject Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subject and all its units, modules, and resources. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSubject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Regulation Dialog */}
      <Dialog open={isEditRegulationDialogOpen} onOpenChange={setIsEditRegulationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Regulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Regulation Name</Label>
              <Input
                value={editRegulationName}
                onChange={(e) => setEditRegulationName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleEditRegulation} 
              className="w-full"
              disabled={updateRegulation.isPending}
            >
              {updateRegulation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Regulation Confirmation */}
      <AlertDialog open={deleteRegulationDialogOpen} onOpenChange={setDeleteRegulationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Regulation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this regulation. All subjects using this regulation will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRegulation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Update Request</DialogTitle>
            <DialogDescription>
              Request the owner of "{requestSubject?.name}" to make changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Describe what changes you'd like to suggest..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleSendRequest} 
              className="w-full"
              disabled={createUpdateRequest.isPending || !requestMessage.trim()}
            >
              {createUpdateRequest.isPending ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Received & Sent Requests Panel */}
      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Requests</DialogTitle>
            <DialogDescription>
              Manage requests from other faculty and view replies to your requests.
            </DialogDescription>
          </DialogHeader>
          
          {/* Received Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Received Requests</h3>
            {receivedRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No pending requests</p>
            ) : (
              receivedRequests.map((req) => {
                const reqSubject = subjects.find(s => s.id === req.subject_id);
                const requesterName = creatorNames[req.requester_id] || 'Unknown Faculty';
                return (
                  <Card key={req.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{requesterName}</p>
                          <p className="text-xs text-muted-foreground">Subject: {reqSubject?.name || 'Unknown'}</p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <p className="text-sm text-foreground">{req.message}</p>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyTexts[req.id] || ''}
                          onChange={(e) => setReplyTexts(prev => ({ ...prev, [req.id]: e.target.value }))}
                          rows={2}
                        />
                        <Button 
                          size="sm" 
                          className="gap-1 w-full"
                          disabled={!replyTexts[req.id]?.trim() || respondToRequest.isPending}
                          onClick={() => {
                            handleRespondToRequest(req.id, replyTexts[req.id]);
                            setReplyTexts(prev => { const n = { ...prev }; delete n[req.id]; return n; });
                          }}
                        >
                          <Send className="w-3 h-3" />
                          Send Reply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sent Requests */}
          <div className="space-y-3 mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-foreground">Your Sent Requests</h3>
            {sentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No sent requests</p>
            ) : (
              sentRequests.map((req) => {
                const reqSubject = subjects.find(s => s.id === req.subject_id);
                const ownerName = creatorNames[req.owner_id] || 'Unknown Faculty';
                return (
                  <Card key={req.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">To: {ownerName}</p>
                          <p className="text-xs text-muted-foreground">Subject: {reqSubject?.name || 'Unknown'}</p>
                        </div>
                        <Badge variant={req.status === 'pending' ? 'outline' : 'secondary'}>
                          {req.status === 'pending' ? 'Pending' : 'Replied'}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{req.message}</p>
                      {req.reply && (
                        <div className="bg-muted rounded-md p-3 mt-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Reply from {ownerName}:</p>
                          <p className="text-sm text-foreground">{req.reply}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Faculty Name Prompt on First Login */}
      <Dialog open={showNamePrompt} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Welcome! Please enter your name</DialogTitle>
            <DialogDescription>
              This is your first login. Please enter your full name to complete your profile setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter your full name"
                value={facultyDisplayName}
                onChange={(e) => setFacultyDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
            </div>
            <Button className="w-full" onClick={handleSaveName} disabled={savingName}>
              {savingName ? 'Saving...' : 'Save Name'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
