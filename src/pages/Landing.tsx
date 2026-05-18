import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Compass, GraduationCap, Sparkles } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const tiles = [
    {
      title: 'College',
      desc: 'Manage your college ecosystem',
      icon: Building2,
      onClick: () => navigate('/colleges'),
    },
    {
      title: 'Explorer',
      desc: 'Explore academic content',
      icon: Compass,
      onClick: () => navigate('/explore'),
    },
    {
      title: 'Student',
      desc: 'Student login and access',
      icon: GraduationCap,
      onClick: () => navigate('/student-login'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="text-center mb-14 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-5 text-xs font-medium text-primary-foreground/80">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Premium learning platform
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-gradient-primary">
          StudyEase
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto">
          A futuristic learning ecosystem for colleges, faculty, and students.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {tiles.map(({ title, desc, icon: Icon, onClick }) => (
          <Card
            key={title}
            onClick={onClick}
            className="glass-card rounded-3xl cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:glow-primary"
          >
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="relative w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center icon-float shadow-lg">
                  <Icon className="w-10 h-10 text-white" strokeWidth={1.75} />
                </div>
              </div>
              <h2 className="font-semibold text-2xl mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Landing;
