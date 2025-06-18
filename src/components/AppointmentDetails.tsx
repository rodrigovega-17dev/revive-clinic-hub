
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, User, Clock, DollarSign, CreditCard, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentDetailsProps {
  appointment: any;
  open: boolean;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, open, onClose }: AppointmentDetailsProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const [paymentData, setPaymentData] = useState({
    amount: appointment?.payment_amount || 0,
    method: appointment?.payment_method || '',
  });
  const [rescheduleData, setRescheduleData] = useState({
    start_time: appointment ? format(new Date(appointment.start_time), "yyyy-MM-dd'T'HH:mm") : '',
    duration: appointment ? 
      Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000).toString() : 
      '60'
  });
  
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();

  const handleMarkAsPaid = async () => {
    if (!paymentData.method) {
      toast({
        title: 'Error',
        description: 'Please select a payment method.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        payment_status: 'paid',
        payment_method: paymentData.method,
        payment_amount: paymentData.amount,
        payment_date: new Date().toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Payment recorded successfully!',
      });
      
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.start_time) {
      toast({
        title: 'Error',
        description: 'Please select a new date and time.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const startTime = new Date(rescheduleData.start_time);
      const durationMinutes = parseInt(rescheduleData.duration);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      await updateAppointment.mutateAsync({
        id: appointment.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Appointment rescheduled successfully!',
      });
      
      onClose();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to reschedule appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelAppointment = async () => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        status: 'cancelled',
      });

      toast({
        title: 'Success',
        description: 'Appointment cancelled successfully!',
      });
      
      onClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Appointment Details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage appointment status, payment, and scheduling
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="reschedule">Reschedule</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card className="bg-muted/20 border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Appointment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {appointment.clients?.first_name} {appointment.clients?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(new Date(appointment.start_time), 'PPP')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(new Date(appointment.start_time), 'p')} - {format(new Date(appointment.end_time), 'p')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      ${appointment.payment_amount || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={appointment.status === 'completed' ? 'default' : 
                                   appointment.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {appointment.status}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Payment:</span>
                    <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {appointment.payment_status || 'pending'}
                    </Badge>
                  </div>
                </div>

                {appointment.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="text-foreground mt-1 p-2 bg-muted/50 rounded">{appointment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between space-x-3">
              <Button 
                variant="destructive" 
                onClick={handleCancelAppointment}
                disabled={updateAppointment.isPending || appointment.status === 'cancelled'}
              >
                Cancel Appointment
              </Button>
              
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            {appointment.payment_status !== 'paid' && appointment.status !== 'cancelled' ? (
              <Card className="bg-muted/20 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Record Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-foreground">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method" className="text-foreground">Payment Method</Label>
                      <Select value={paymentData.method} onValueChange={(value) => 
                        setPaymentData(prev => ({ ...prev, method: value }))
                      }>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="cash" className="text-foreground">Cash</SelectItem>
                          <SelectItem value="card" className="text-foreground">Card</SelectItem>
                          <SelectItem value="transfer" className="text-foreground">Transfer</SelectItem>
                          <SelectItem value="insurance" className="text-foreground">Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleMarkAsPaid} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20 border-border">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-medium text-foreground mb-2">
                    {appointment.payment_status === 'paid' ? 'Payment Completed' : 'Payment Not Available'}
                  </div>
                  <div className="text-muted-foreground">
                    {appointment.payment_status === 'paid' 
                      ? `Paid via ${appointment.payment_method} on ${format(new Date(appointment.payment_date), 'PPP')}`
                      : 'Payment cannot be processed for cancelled appointments'
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reschedule" className="space-y-4">
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' ? (
              <Card className="bg-muted/20 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Reschedule Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_datetime" className="text-foreground">New Date & Time</Label>
                      <Input
                        id="new_datetime"
                        type="datetime-local"
                        value={rescheduleData.start_time}
                        onChange={(e) => setRescheduleData(prev => ({ ...prev, start_time: e.target.value }))}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-foreground">Duration</Label>
                      <Select value={rescheduleData.duration} onValueChange={(value) => 
                        setRescheduleData(prev => ({ ...prev, duration: value }))
                      }>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="60" className="text-foreground">60 minutes</SelectItem>
                          <SelectItem value="120" className="text-foreground">120 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleReschedule} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Reschedule Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20 border-border">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-medium text-foreground mb-2">
                    Rescheduling Not Available
                  </div>
                  <div className="text-muted-foreground">
                    {appointment.status === 'completed' 
                      ? 'Completed appointments cannot be rescheduled'
                      : 'Cancelled appointments cannot be rescheduled'
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;
