
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, User, Clock, DollarSign, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentDetailsProps {
  appointment: any;
  open: boolean;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, open, onClose }: AppointmentDetailsProps) => {
  const [paymentData, setPaymentData] = useState({
    amount: appointment?.payment_amount || 0,
    method: appointment?.payment_method || '',
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
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
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
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Appointment Details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage appointment status and payment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Appointment Info */}
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
                    {format(new Date(appointment.start_time), 'p')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    ${appointment.payment_amount}
                  </span>
                </div>
              </div>
              
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
                  {appointment.payment_status}
                </Badge>
              </div>

              {appointment.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="text-foreground mt-1">{appointment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Section */}
          {appointment.payment_status !== 'paid' && appointment.status !== 'cancelled' && (
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
          )}

          {/* Actions */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;
