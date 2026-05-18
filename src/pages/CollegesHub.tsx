import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, LogIn, GraduationCap, ArrowLeft } from 'lucide-react';

const CollegesHub = () => {
  const navigate = useNavigate();

  const items = [
    { icon: PlusCircle, title: 'Create College', desc: 'Register a new college and its first admin', to: '/create-college' },
    { icon: LogIn, title: 'College Login', desc: 'Admin and Faculty sign-in for your college', to: '/college-login' },
    { icon: GraduationCap, title: 'Student Login', desc: 'Sign in with your admin-issued credentials', to: '/student-login' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-gradient-primary">Colleges</h1>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, title, desc, to }) => (
            <Card
              key={title}
              onClick={() => navigate(to)}
              className="glass-card rounded-3xl cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:glow-primary"
            >
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity" />
                  <div className="relative w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center icon-float shadow-lg">
                    <Icon className="w-8 h-8 text-white" strokeWidth={1.75} />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollegesHub;
