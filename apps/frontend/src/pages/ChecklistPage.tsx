import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export const ChecklistPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Document Checklist</h1>
        <Button variant="outline" onClick={() => navigate('/search')}>Search Schemes</Button>
      </div>
      <Card title="Personalized Application Checklist" subtitle="Track your required documents step-by-step.">
        <p className="text-slate-300 text-sm">Select a scheme to generate your personalized document checklist.</p>
      </Card>
    </div>
  );
};
