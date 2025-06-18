
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download } from 'lucide-react';
import ExpenseForm from '@/components/ExpenseForm';
import DailyFinanceSection from '@/components/DailyFinanceSection';
import MonthlyFinanceSection from '@/components/MonthlyFinanceSection';

const Finance = () => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Track payments, revenue, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily Finance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Finance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-6">
          <DailyFinanceSection 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </TabsContent>
        
        <TabsContent value="monthly" className="space-y-6">
          <MonthlyFinanceSection />
        </TabsContent>
      </Tabs>

      {/* Expense Form Modal */}
      <ExpenseForm 
        open={showExpenseForm} 
        onClose={() => setShowExpenseForm(false)} 
      />
    </div>
  );
};

export default Finance;
