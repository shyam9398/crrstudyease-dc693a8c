import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleWithResources, useCreateResource, useUpdateResource, useDeleteResource, useUploadFile, useToggleModuleComplete, useStudentProgress } from '@/hooks/useResources';
import { useCustomCategories, useCreateCustomCategory, useUpdateCustomCategory, useDeleteCustomCategory } from '@/hooks/useCustomCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Youtube,
  FileText,
  BookOpen,
  HelpCircle,
  History,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  LogOut,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

type ResourceType = 'youtube' | 'notes' | 'important-questions' | 'pyq';

const resourceTypes = [
  { type: 'youtube' as ResourceType, label: 'YouTube Videos', icon: Youtube, color: 'text-red-500' },
  { type: 'notes' as ResourceType, label: 'Notes', icon: FileText, color: 'text-blue-500' },
  { type: 'important-questions' as ResourceType, label: 'Important Questions', icon: HelpCircle, color: 'text-amber-500' },
  { type: 'pyq' as ResourceType, label: 'Previous Year Questions', icon: History, color: 'text-purple-500' },
];

const ModulePage = () => {
  const { id: subjectId, unitId, moduleId } = useParams();
  const { isFaculty, user, signOut } = useAuth();
  const { data: moduleData, isLoading } = useModuleWithResources(moduleId);
  const { data: progress } = useStudentProgress(moduleId);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  const uploadFile = useUploadFile();
  const toggleComplete = useToggleModuleComplete();

  // Custom categories
  const subjectIdForCategories = moduleData?.units?.subjects?.id;
  const { data: customCategories = [] } = useCustomCategories(subjectIdForCategories);
  const createCategory = useCreateCustomCategory();
  const updateCategory = useUpdateCustomCategory();
  const deleteCategory = useDeleteCustomCategory();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<string>('youtube');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [newResourceLanguage, setNewResourceLanguage] = useState('english');
  const [editResourceTitle, setEditResourceTitle] = useState('');
  const [editResourceUrl, setEditResourceUrl] = useState('');
  const [editResourceContent, setEditResourceContent] = useState('');
  const [editResourceLanguage, setEditResourceLanguage] = useState('english');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Custom category dialog states
  const [isAddFeatureDialogOpen, setIsAddFeatureDialogOpen] = useState(false);
  const [isEditFeatureDialogOpen, setIsEditFeatureDialogOpen] = useState(false);
  const [deleteFeatureDialogOpen, setDeleteFeatureDialogOpen] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [editFeatureName, setEditFeatureName] = useState('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-10 w-64" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-full mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Module not found</h2>
          <Link to="/dashboard">
            <Button>← Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const subject = moduleData.units?.subjects;
  const unit = moduleData.units;
  const resources = moduleData.resources || [];
  const isSubjectOwner = isFaculty && subject?.created_by === user?.id;
  const canAddResources = isSubjectOwner;
  const canEditResource = (createdBy: string) => isFaculty && createdBy === user?.id;
  const isCompleted = progress?.completed || false;

  const isBuiltInTab = resourceTypes.some(rt => rt.type === activeTab);
  const isCustomTab = !isBuiltInTab;
  const activeBuiltInType = resourceTypes.find(rt => rt.type === activeTab);

  const handleAddResource = async () => {
    if (!moduleId || !newResourceTitle.trim()) return;

    const insertData: any = {
      moduleId,
      type: isCustomTab ? ('notes' as const) : (activeTab as ResourceType),
      title: newResourceTitle,
      url: newResourceUrl || undefined,
      content: newResourceContent || undefined,
      language: activeTab === 'youtube' ? newResourceLanguage : undefined,
      customCategoryId: isCustomTab ? activeTab : undefined,
    };

    await createResource.mutateAsync(insertData);

    setNewResourceTitle('');
    setNewResourceUrl('');
    setNewResourceContent('');
    setNewResourceLanguage('english');
    setIsAddDialogOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !moduleId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    setUploadingFile(true);
    try {
      const path = `${moduleId}/${Date.now()}_${file.name}`;
      const publicUrl = await uploadFile.mutateAsync({ file, path });
      
      await createResource.mutateAsync({
        moduleId,
        type: isCustomTab ? ('notes' as const) : (activeTab as ResourceType),
        title: file.name.replace('.pdf', ''),
        url: publicUrl,
        customCategoryId: isCustomTab ? activeTab : undefined,
      });

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error(error);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openEditDialog = (resource: typeof resources[0]) => {
    setSelectedResourceId(resource.id);
    setEditResourceTitle(resource.title);
    setEditResourceUrl(resource.url || '');
    setEditResourceContent(resource.content || '');
    setIsEditDialogOpen(true);
  };

  const handleEditResource = async () => {
    if (!selectedResourceId || !editResourceTitle.trim()) return;

    await updateResource.mutateAsync({
      id: selectedResourceId,
      title: editResourceTitle,
      url: editResourceUrl || undefined,
      content: editResourceContent || undefined,
    });

    setIsEditDialogOpen(false);
    setSelectedResourceId(null);
  };

  const handleDeleteResource = async () => {
    if (!selectedResourceId) return;
    
    await deleteResource.mutateAsync(selectedResourceId);
    setDeleteDialogOpen(false);
    setSelectedResourceId(null);
  };

  const handleToggleComplete = async () => {
    if (!moduleId) return;
    await toggleComplete.mutateAsync({ moduleId, completed: !isCompleted });
  };

  const handleAddFeature = async () => {
    if (!subjectIdForCategories || !newFeatureName.trim()) return;
    await createCategory.mutateAsync({ subjectId: subjectIdForCategories, name: newFeatureName });
    setNewFeatureName('');
    setIsAddFeatureDialogOpen(false);
  };

  const handleEditFeature = async () => {
    if (!selectedFeatureId || !editFeatureName.trim()) return;
    await updateCategory.mutateAsync({ id: selectedFeatureId, name: editFeatureName });
    setIsEditFeatureDialogOpen(false);
    setSelectedFeatureId(null);
  };

  const handleDeleteFeature = async () => {
    if (!selectedFeatureId) return;
    await deleteCategory.mutateAsync(selectedFeatureId);
    setDeleteFeatureDialogOpen(false);
    setSelectedFeatureId(null);
    // Switch to a built-in tab if we deleted the active custom tab
    if (activeTab === selectedFeatureId) setActiveTab('youtube');
  };

  const isPdfType = activeTab === 'notes' || activeTab === 'important-questions' || activeTab === 'pyq' || isCustomTab;

  const getActiveLabel = () => {
    if (activeBuiltInType) return activeBuiltInType.label;
    const cc = customCategories.find(c => c.id === activeTab);
    return cc?.name || 'Resources';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to={`/subject/${subjectId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{subject?.code}</Badge>
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">{unit?.name}</Badge>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{moduleData.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id="complete"
                checked={isCompleted}
                onCheckedChange={handleToggleComplete}
              />
              <Label htmlFor="complete" className="cursor-pointer text-xs sm:text-sm">
                Complete
              </Label>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Topics */}
        {moduleData.topics && moduleData.topics.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Topics Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {moduleData.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary">{topic}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resources Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2 mb-2">
            <TabsList className="flex-1 justify-start overflow-x-auto">
              {resourceTypes.map((rt) => (
                <TabsTrigger key={rt.type} value={rt.type} className="gap-2">
                  <rt.icon className={`w-4 h-4 ${rt.color}`} />
                  <span className="hidden sm:inline">{rt.label}</span>
                </TabsTrigger>
              ))}
              {customCategories.map((cc) => (
                <TabsTrigger key={cc.id} value={cc.id} className="gap-2 group/tab">
                  <Tag className="w-4 h-4 text-green-500" />
                  <span className="hidden sm:inline">{cc.name}</span>
                  {isFaculty && cc.created_by === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeatureId(cc.id);
                          setEditFeatureName(cc.name);
                          setIsEditFeatureDialogOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeatureId(cc.id);
                          setDeleteFeatureDialogOpen(true);
                        }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {/* Add Feature button - Faculty only */}
            {isFaculty && subjectIdForCategories && (
              <Dialog open={isAddFeatureDialogOpen} onOpenChange={setIsAddFeatureDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Feature</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Feature</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Feature Name</Label>
                      <Input
                        placeholder="e.g., Lab Manuals, Assignments"
                        value={newFeatureName}
                        onChange={(e) => setNewFeatureName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddFeature} className="w-full" disabled={createCategory.isPending}>
                      {createCategory.isPending ? 'Adding...' : 'Add Feature'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Built-in resource type tabs */}
          {resourceTypes.map((rt) => {
            const filteredResources = resources.filter((r) => r.type === rt.type && !(r as any).custom_category_id);
            
            return (
              <TabsContent key={rt.type} value={rt.type} className="mt-6">
                {canAddResources && (
                  <div className="flex gap-2 mb-4">
                    <Dialog open={isAddDialogOpen && activeTab === rt.type} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add {rt.label}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add {rt.label}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              placeholder="Enter title"
                              value={newResourceTitle}
                              onChange={(e) => setNewResourceTitle(e.target.value)}
                            />
                          </div>
                          {rt.type === 'youtube' && (
                            <>
                              <div className="space-y-2">
                                <Label>YouTube URL</Label>
                                <Input
                                  placeholder="https://youtube.com/watch?v=..."
                                  value={newResourceUrl}
                                  onChange={(e) => setNewResourceUrl(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Language</Label>
                                <Select value={newResourceLanguage} onValueChange={setNewResourceLanguage}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="telugu">Telugu</SelectItem>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="hindi">Hindi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                          {(rt.type === 'notes' || rt.type === 'important-questions' || rt.type === 'pyq') && (
                            <div className="space-y-2">
                              <Label>PDF URL (optional)</Label>
                              <Input
                                placeholder="https://..."
                                value={newResourceUrl}
                                onChange={(e) => setNewResourceUrl(e.target.value)}
                              />
                            </div>
                          )}
                          <Button 
                            onClick={handleAddResource} 
                            className="w-full"
                            disabled={createResource.isPending}
                          >
                            {createResource.isPending ? 'Adding...' : 'Add Resource'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {(rt.type === 'notes' || rt.type === 'important-questions' || rt.type === 'pyq') && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button 
                          variant="outline" 
                          className="gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingFile ? 'Uploading...' : 'Upload PDF'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Resources List */}
                <div className="space-y-3">
                  {filteredResources.length === 0 ? (
                    <div className="text-center py-12">
                      <rt.icon className={`w-12 h-12 mx-auto ${rt.color} opacity-50 mb-4`} />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No {rt.label} yet</h3>
                      <p className="text-muted-foreground">
                        {canAddResources ? `Add your first ${rt.label.toLowerCase()}.` : `${rt.label} will appear here once added.`}
                      </p>
                    </div>
                  ) : (
                    filteredResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        icon={rt.icon}
                        color={rt.color}
                        canEdit={canEditResource(resource.created_by)}
                        onEdit={() => openEditDialog(resource)}
                        onDelete={() => {
                          setSelectedResourceId(resource.id);
                          setDeleteDialogOpen(true);
                        }}
                        showLanguage={rt.type === 'youtube'}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            );
          })}

          {/* Custom category tabs */}
          {customCategories.map((cc) => {
            const filteredResources = resources.filter((r: any) => r.custom_category_id === cc.id);
            
            return (
              <TabsContent key={cc.id} value={cc.id} className="mt-6">
                {canAddResources && (
                  <div className="flex gap-2 mb-4">
                    <Dialog open={isAddDialogOpen && activeTab === cc.id} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add {cc.name}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add {cc.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              placeholder="Enter title"
                              value={newResourceTitle}
                              onChange={(e) => setNewResourceTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>URL (optional)</Label>
                            <Input
                              placeholder="https://..."
                              value={newResourceUrl}
                              onChange={(e) => setNewResourceUrl(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={handleAddResource} 
                            className="w-full"
                            disabled={createResource.isPending}
                          >
                            {createResource.isPending ? 'Adding...' : 'Add Resource'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingFile ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {filteredResources.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 mx-auto text-green-500 opacity-50 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No {cc.name} yet</h3>
                      <p className="text-muted-foreground">
                        {canAddResources ? `Add your first ${cc.name.toLowerCase()}.` : `${cc.name} will appear here once added.`}
                      </p>
                    </div>
                  ) : (
                    filteredResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        icon={Tag}
                        color="text-green-500"
                        canEdit={canEditResource(resource.created_by)}
                        onEdit={() => openEditDialog(resource)}
                        onDelete={() => {
                          setSelectedResourceId(resource.id);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editResourceTitle}
                onChange={(e) => setEditResourceTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={editResourceUrl}
                onChange={(e) => setEditResourceUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editResourceContent}
                onChange={(e) => setEditResourceContent(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleEditResource} 
              className="w-full"
              disabled={updateResource.isPending}
            >
              {updateResource.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteResource}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Feature Dialog */}
      <Dialog open={isEditFeatureDialogOpen} onOpenChange={setIsEditFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Feature Name</Label>
              <Input
                value={editFeatureName}
                onChange={(e) => setEditFeatureName(e.target.value)}
              />
            </div>
            <Button onClick={handleEditFeature} className="w-full" disabled={updateCategory.isPending}>
              {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Confirmation */}
      <AlertDialog open={deleteFeatureDialogOpen} onOpenChange={setDeleteFeatureDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feature and all its resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteFeature}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Extracted resource card component
function ResourceCard({ resource, icon: Icon, color, canEdit, onEdit, onDelete, showLanguage }: {
  resource: any;
  icon: React.ComponentType<any>;
  color: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showLanguage?: boolean;
}) {
  return (
    <Card className="group hover:shadow-md hover:border-primary/50 transition-all">
      <CardContent className="flex items-center gap-4 p-4">
        <Icon className={`w-6 h-6 ${color} shrink-0`} />
        <div className="flex-1 min-w-0">
          {resource.url ? (
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
              <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors hover:underline">
                {resource.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {resource.content && <p className="text-sm text-muted-foreground line-clamp-2">{resource.content}</p>}
                {showLanguage && resource.language && (
                  <Badge variant="outline" className="text-xs capitalize">{resource.language}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Click to open
              </p>
            </a>
          ) : (
            <>
              <h4 className="font-medium text-foreground truncate">{resource.title}</h4>
              {resource.content && <p className="text-sm text-muted-foreground line-clamp-2">{resource.content}</p>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ModulePage;
