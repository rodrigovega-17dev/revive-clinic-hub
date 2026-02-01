import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Upload, Pen, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SignatureManagerProps {
  open: boolean;
  onClose: () => void;
  entityType: 'therapist' | 'user';
  entityId: string;
  clinicId: string;
  currentSignatureUrl?: string | null;
  onSave: (signatureUrl: string) => void;
}

/**
 * SignatureManager - Modal for uploading or drawing signatures.
 * Supports file upload (PNG, JPG, SVG) and drawing canvas.
 * Uploads to Supabase Storage and updates therapist/profile record.
 */
export const SignatureManager: React.FC<SignatureManagerProps> = ({
  open,
  onClose,
  entityType,
  entityId,
  clinicId,
  currentSignatureUrl,
  onSave,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSignatureUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('common.error'),
        description: 'Please upload PNG, JPG, or SVG file only.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: 'File size must be less than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let fileToUpload: File | null = null;

      if (activeTab === 'upload' && uploadedFile) {
        fileToUpload = uploadedFile;
      } else if (activeTab === 'draw') {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not available');
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          }, 'image/png');
        });
        
        fileToUpload = new File([blob], 'signature.png', { type: 'image/png' });
      }

      if (!fileToUpload) {
        toast({
          title: t('common.error'),
          description: 'Please upload or draw a signature.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // Upload to Supabase Storage
      const fileName = `${clinicId}/${entityType}/${entityId}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update entity record
      const table = entityType === 'therapist' ? 'therapists' : 'profiles';
      const { error: updateError } = await supabase
        .from(table as any)
        .update({ signature_image_url: publicUrl })
        .eq('id', entityId);

      if (updateError) throw updateError;

      toast({
        title: t('common.success'),
        description: t('settings.saveSignature', 'Signature saved successfully'),
      });

      onSave(publicUrl);
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: t('common.error'),
        description: 'Failed to save signature.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      // Delete from storage
      const fileName = `${clinicId}/${entityType}/${entityId}.png`;
      await supabase.storage.from('signatures').remove([fileName]);

      // Update entity record
      const table = entityType === 'therapist' ? 'therapists' : 'profiles';
      const { error: updateError } = await supabase
        .from(table as any)
        .update({ signature_image_url: null })
        .eq('id', entityId);

      if (updateError) throw updateError;

      toast({
        title: t('common.success'),
        description: 'Signature cleared successfully',
      });

      setPreviewUrl(null);
      setUploadedFile(null);
      onSave('');
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: t('common.error'),
        description: 'Failed to clear signature.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.signature', 'My Signature')}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'draw')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              {t('settings.uploadSignature', 'Upload Image')}
            </TabsTrigger>
            <TabsTrigger value="draw">
              <Pen className="h-4 w-4 mr-2" />
              {t('settings.drawSignature', 'Draw Signature')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                id="signature-upload"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="signature-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload PNG, JPG, or SVG (max 2MB)
                </p>
              </label>
            </div>
            {previewUrl && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <img src={previewUrl} alt={t('settings.signaturePreview', 'Signature preview')} className="max-w-full max-h-32 mx-auto" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="draw" className="space-y-4 mt-4">
            <div className="border rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ touchAction: 'none' }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.clearSignature', 'Clear')}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <div className="flex gap-2">
            {currentSignatureUrl && (
              <Button variant="destructive" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t('common.loading') : t('settings.saveSignature', 'Save Signature')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
