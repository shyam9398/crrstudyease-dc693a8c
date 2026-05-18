import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, LogIn, GraduationCap, ArrowLeft } from 'lucide-react';

const CollegesHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Colleges</h1>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card
            className="glass-card rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => navigate('/create-college')}
          >
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-primary/40 rounded-2xl flex items-center justify-center mb-4">
                <PlusCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Create College</h3>
              <p className="text-xs text-muted-foreground text-center">
                Register a new college and its first admin
              </p>
            </CardContent>
          </Card>

          <Card
            className="glass-card rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => navigate('/college-login')}
          >
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">College Login</h3>
              <p className="text-xs text-muted-foreground text-center">
                Admin and Faculty sign-in for your college
              </p>
            </CardContent>
          </Card>

          <Card
            className="glass-card rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => navigate('/student-login')}
          >
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Student Login</h3>
              <p className="text-xs text-muted-foreground text-center">
                Sign in with your admin-issued credentials
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollegesHub;
