import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Download, DollarSign, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataExport } from '@/hooks/useDataExport';
import ExpenseForm from '@/components/ExpenseForm';
import PaymentForm from '@/components/PaymentForm';
import DailyFinanceSection from '@/components/DailyFinanceSection';
import MonthlyFinanceSection from '@/components/MonthlyFinanceSection';
import { useSearchParams } from 'react-router-dom';

const Finance = () => {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const { exportPaymentsToCsv, exportExpensesToCsv, isExporting } = useDataExport();
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('finance.title')}</h1>
          <p className="text-muted-foreground">{t('finance.trackFinance')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowPaymentForm(true)} variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('finance.addPayment')}
          </Button>
          <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.addExpense')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!!isExporting || !clinicId}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('common.export')}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => clinicId && exportPaymentsToCsv(clinicId)}
                disabled={isExporting === 'payments'}
              >
                {isExporting === 'payments' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('finance.exportPayments', 'Ingresos (CSV)')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => clinicId && exportExpensesToCsv(clinicId)}
                disabled={isExporting === 'expenses'}
              >
                {isExporting === 'expenses' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('finance.exportExpenses', 'Gastos (CSV)')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
