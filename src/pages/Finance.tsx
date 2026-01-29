import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, DollarSign } from 'lucide-react';
import ExpenseForm from '@/components/ExpenseForm';
import PaymentForm from '@/components/PaymentForm';
import DailyFinanceSection from '@/components/DailyFinanceSection';
import MonthlyFinanceSection from '@/components/MonthlyFinanceSection';
import { useSearchParams } from 'react-router-dom';

const Finance = () => {
  const { t } = useTranslation();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [searchParams] = useSearchParams();

  // Check URL parameters to auto-open form
  useEffect(() => {
    if (searchParams.get('showExpenseForm') === 'true') {
      setShowExpenseForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showExpenseForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
    if (searchParams.get('showPaymentForm') === 'true') {
      setShowPaymentForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showPaymentForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('finance.title')}</h1>
          <p className="text-muted-foreground">{t('finance.trackFinance')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentForm(true)} variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('finance.addPayment')}
          </Button>
          <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.addExpense')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">{t('finance.dailyFinance')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('finance.monthlyFinance')}</TabsTrigger>
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

      {/* Payment Form Modal */}
      <PaymentForm 
        open={showPaymentForm} 
        onClose={() => setShowPaymentForm(false)} 
      />
    </div>
  );
};

export default Finance;
