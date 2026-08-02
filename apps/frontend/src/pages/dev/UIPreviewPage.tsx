import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Modal } from '../../components/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import { useToast } from '../../components/ui/use-toast';
import { Toaster } from '../../components/ui/toaster';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { Label } from '../../components/ui/label';
import { Type, Sparkles } from 'lucide-react';

export const UIPreviewPage: React.FC = () => {
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const toggleLargeText = () => {
    const root = document.documentElement;
    if (!largeTextMode) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    setLargeTextMode(!largeTextMode);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 max-w-6xl mx-auto space-y-10">
      <Toaster />

      {/* Header & Accessibility Toggle */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h1 className="text-3xl font-extrabold text-white">BharatAssist UI Design System Preview</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Dev-only verification page for installed shadcn/ui components & custom accessibility primitives.
          </p>
        </div>
        <Button
          variant={largeTextMode ? 'default' : 'outline'}
          onClick={toggleLargeText}
          className="flex items-center gap-2"
        >
          <Type className="w-4 h-4" />
          {largeTextMode ? 'Large-Text Mode: ACTIVE' : 'Toggle Large-Text Mode'}
        </Button>
      </header>

      {/* 1. Buttons */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-amber-400 border-b border-slate-800 pb-2">1. Buttons & Badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Primary Saffron</Button>
          <Button variant="secondary">Secondary Navy</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge variant="default">Central Scheme</Badge>
          <Badge variant="secondary">State Scheme</Badge>
          <Badge variant="destructive">Closing Soon</Badge>
          <Badge variant="outline">Draft</Badge>
        </div>
      </section>

      {/* 2. Form Controls */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-amber-400 border-b border-slate-800 pb-2">2. Inputs, Select & Form Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Citizen Name" placeholder="e.g. Ramesh Kumar" />
          <Input label="Annual Income (₹)" placeholder="250000" error="Must be a valid positive number" />
          <div className="space-y-2">
            <Label>Select Occupation Category</Label>
            <Select>
              <SelectTrigger className="bg-slate-800">
                <SelectValue placeholder="Choose occupation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student / Undergraduate</SelectItem>
                <SelectItem value="farmer">Farmer / Landowner</SelectItem>
                <SelectItem value="msme">MSME / Business Owner</SelectItem>
                <SelectItem value="senior">Senior Citizen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Multilingual Support (Filtered Completeness)</Label>
            <LanguageSelector />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox id="terms" />
            <label htmlFor="terms" className="text-sm font-medium text-slate-300 cursor-pointer">
              I certify that I hold a valid Aadhaar card
            </label>
          </div>

          <RadioGroup defaultValue="online" className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="online" id="r1" />
              <label htmlFor="r1" className="text-sm text-slate-300">Online Application</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="offline" id="r2" />
              <label htmlFor="r2" className="text-sm text-slate-300">Offline Counter</label>
            </div>
          </RadioGroup>
        </div>
      </section>

      {/* 3. Cards & Modal */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-amber-400 border-b border-slate-800 pb-2">3. Card & Dialog (Modal)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Karnataka Vidyasiri Scholarship</CardTitle>
              <CardDescription>Department of Backward Classes Welfare</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Full tuition fee reimbursement for post-matric undergraduate students.
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-amber-400 font-bold">₹15,000 / year</span>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>Open Modal Dialog</Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Toast Notification Test</CardTitle>
              <CardDescription>Shadcn Toast System</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Test triggering system notifications for eligibility outcomes and saved schemes.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() =>
                  toast({
                    title: 'Eligibility Saved!',
                    description: 'Your profile has been matched with 4 active schemes.'
                  })
                }
              >
                Trigger System Toast
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Shadcn Dialog Wrapper Test">
          <p className="text-sm text-slate-300 mb-4">
            This Modal component wraps `shadcn Dialog` for complete accessibility, keyboard focus trapping, and overlay animations.
          </p>
          <Button onClick={() => setIsModalOpen(false)} variant="primary">Close Dialog</Button>
        </Modal>
      </section>

      {/* 4. Tabs & Dropdown Menu */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-amber-400 border-b border-slate-800 pb-2">4. Tabs & Dropdown Menu</h2>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Tabs defaultValue="overview" className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="guidance">Guidance</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">Detailed scheme overview content powered by shadcn Tabs.</p>
            </TabsContent>
            <TabsContent value="documents" className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">Required document list checklist view.</p>
            </TabsContent>
            <TabsContent value="guidance" className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">Step-by-step application guidance walkthrough.</p>
            </TabsContent>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions Dropdown Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Scheme Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Save to My Schemes</DropdownMenuItem>
              <DropdownMenuItem>Check Eligibility</DropdownMenuItem>
              <DropdownMenuItem>Share Official Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* 5. Loading & Empty State Wrappers */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-amber-400 border-b border-slate-800 pb-2">5. Loading & Empty State Custom Wrappers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-semibold mb-2">Skeleton LoadingState Wrapper</h3>
            <LoadingState message="Fetching scheme requirements from database..." />
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-semibold mb-2">Custom EmptyState Component</h3>
            <EmptyState title="No saved schemes found" description="Explore schemes and click save to view them here later." />
          </div>
        </div>
      </section>
    </div>
  );
};
