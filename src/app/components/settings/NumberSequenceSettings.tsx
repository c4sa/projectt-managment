import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { numberGenerator, NumberSequence } from '../../utils/numberGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Settings, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SequenceFormProps {
  type: string;
  sequence: NumberSequence;
  onUpdate: (sequence: Partial<NumberSequence>) => void;
  onReset: () => void;
  label: string;
}

function SequenceForm({ type, sequence, onUpdate, onReset, label }: SequenceFormProps) {
  const { t, language } = useLanguage();
  const [localSequence, setLocalSequence] = useState(sequence);

  const handleChange = (field: keyof NumberSequence, value: any) => {
    setLocalSequence(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(localSequence);
    toast.success(language === 'en' ? 'Sequence updated successfully' : 'تم تحديث التسلسل بنجاح');
  };

  const handleResetClick = () => {
    onReset();
    setLocalSequence(numberGenerator.getSequence(type as any));
    toast.success(language === 'en' ? 'Sequence reset to default' : 'تم إعادة تعيين التسلسل إلى الافتراضي');
  };

  const preview = numberGenerator.previewNumber(type as any);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{label}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetClick}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.reset')}
          </Button>
        </CardTitle>
        <CardDescription>
          {language === 'en' 
            ? 'Configure the auto-numbering format' 
            : 'تكوين تنسيق الترقيم التلقائي'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              {language === 'en' ? 'Preview:' : 'معاينة:'}
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            {preview}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prefix */}
          <div className="space-y-2">
            <Label htmlFor={`${type}-prefix`}>
              {language === 'en' ? 'Prefix' : 'البادئة'}
            </Label>
            <Input
              id={`${type}-prefix`}
              value={localSequence.prefix}
              onChange={(e) => handleChange('prefix', e.target.value.toUpperCase())}
              placeholder="PRJ"
            />
          </div>

          {/* Separator */}
          <div className="space-y-2">
            <Label htmlFor={`${type}-separator`}>
              {language === 'en' ? 'Separator' : 'الفاصل'}
            </Label>
            <Input
              id={`${type}-separator`}
              value={localSequence.separator}
              onChange={(e) => handleChange('separator', e.target.value)}
              placeholder="-"
              maxLength={1}
            />
          </div>

          {/* Start Number */}
          <div className="space-y-2">
            <Label htmlFor={`${type}-startNumber`}>
              {language === 'en' ? 'Start Number' : 'رقم البداية'}
            </Label>
            <Input
              id={`${type}-startNumber`}
              type="number"
              value={localSequence.startNumber}
              onChange={(e) => handleChange('startNumber', parseInt(e.target.value))}
              min={1}
            />
          </div>

          {/* Current Number */}
          <div className="space-y-2">
            <Label htmlFor={`${type}-currentNumber`}>
              {language === 'en' ? 'Current Number' : 'الرقم الحالي'}
            </Label>
            <Input
              id={`${type}-currentNumber`}
              type="number"
              value={localSequence.currentNumber}
              onChange={(e) => handleChange('currentNumber', parseInt(e.target.value))}
              min={1}
            />
          </div>

          {/* Padding */}
          <div className="space-y-2">
            <Label htmlFor={`${type}-padding`}>
              {language === 'en' ? 'Number Padding' : 'عدد الأرقام'}
            </Label>
            <Input
              id={`${type}-padding`}
              type="number"
              value={localSequence.padding}
              onChange={(e) => handleChange('padding', parseInt(e.target.value))}
              min={1}
              max={10}
            />
            <p className="text-xs text-gray-500">
              {language === 'en' 
                ? `Pads numbers with zeros (e.g., ${localSequence.padding} digits = 0001)` 
                : `إضافة أصفار (مثال: ${localSequence.padding} أرقام = 0001)`}
            </p>
          </div>
        </div>

        {/* Switches */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`${type}-includeYear`}>
                {language === 'en' ? 'Include Year' : 'تضمين السنة'}
              </Label>
              <p className="text-xs text-gray-500">
                {language === 'en' 
                  ? 'Auto-resets at the start of each year' 
                  : 'إعادة التعيين تلقائياً في بداية كل سنة'}
              </p>
            </div>
            <Switch
              id={`${type}-includeYear`}
              checked={localSequence.includeYear}
              onCheckedChange={(checked) => handleChange('includeYear', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`${type}-includeMonth`}>
                {language === 'en' ? 'Include Month' : 'تضمين الشهر'}
              </Label>
              <p className="text-xs text-gray-500">
                {language === 'en' 
                  ? 'Auto-resets at the start of each month' 
                  : 'إعادة التعيين تلقائياً في بداية كل شهر'}
              </p>
            </div>
            <Switch
              id={`${type}-includeMonth`}
              checked={localSequence.includeMonth}
              onCheckedChange={(checked) => handleChange('includeMonth', checked)}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function NumberSequenceSettings() {
  const { t, language } = useLanguage();
  const [sequences, setSequences] = useState(numberGenerator.getAllSequences());

  const handleUpdate = (type: string, sequence: Partial<NumberSequence>) => {
    numberGenerator.updateSequence(type as any, sequence);
    setSequences(numberGenerator.getAllSequences());
  };

  const handleReset = (type: string) => {
    numberGenerator.resetSequence(type as any);
    setSequences(numberGenerator.getAllSequences());
  };

  const handleResetAll = () => {
    if (confirm(language === 'en' 
      ? 'Are you sure you want to reset all sequences to default?' 
      : 'هل أنت متأكد من إعادة تعيين جميع التسلسلات إلى الافتراضي؟')) {
      numberGenerator.resetAllSequences();
      setSequences(numberGenerator.getAllSequences());
      toast.success(language === 'en' 
        ? 'All sequences reset successfully' 
        : 'تم إعادة تعيين جميع التسلسلات بنجاح');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            {language === 'en' ? 'Auto-Numbering Settings' : 'إعدادات الترقيم التلقائي'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Configure automatic number generation for all entities' 
              : 'تكوين إنشاء الأرقام التلقائية لجميع الكيانات'}
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleResetAll}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {language === 'en' ? 'Reset All' : 'إعادة تعيين الكل'}
        </Button>
      </div>

      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <TabsTrigger value="project">{language === 'en' ? 'Projects' : 'المشاريع'}</TabsTrigger>
          <TabsTrigger value="purchaseOrder">{language === 'en' ? 'PO' : 'أمر الشراء'}</TabsTrigger>
          <TabsTrigger value="vendor">{language === 'en' ? 'Vendors' : 'الموردين'}</TabsTrigger>
          <TabsTrigger value="customer">{language === 'en' ? 'Customers' : 'العملاء'}</TabsTrigger>
          <TabsTrigger value="invoice">{language === 'en' ? 'Invoices' : 'الفواتير'}</TabsTrigger>
          <TabsTrigger value="payment">{language === 'en' ? 'Payments' : 'المدفوعات'}</TabsTrigger>
          <TabsTrigger value="variationOrder">{language === 'en' ? 'VO' : 'أمر التغيير'}</TabsTrigger>
          <TabsTrigger value="claim">{language === 'en' ? 'Claims' : 'المطالبات'}</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-6">
          <SequenceForm
            type="project"
            sequence={sequences.project}
            onUpdate={(seq) => handleUpdate('project', seq)}
            onReset={() => handleReset('project')}
            label={language === 'en' ? 'Project Numbers' : 'أرقام المشاريع'}
          />
        </TabsContent>

        <TabsContent value="purchaseOrder" className="mt-6">
          <SequenceForm
            type="purchaseOrder"
            sequence={sequences.purchaseOrder}
            onUpdate={(seq) => handleUpdate('purchaseOrder', seq)}
            onReset={() => handleReset('purchaseOrder')}
            label={language === 'en' ? 'Purchase Order Numbers' : 'أرقام أوامر الشراء'}
          />
        </TabsContent>

        <TabsContent value="vendor" className="mt-6">
          <SequenceForm
            type="vendor"
            sequence={sequences.vendor}
            onUpdate={(seq) => handleUpdate('vendor', seq)}
            onReset={() => handleReset('vendor')}
            label={language === 'en' ? 'Vendor Codes' : 'أكواد الموردين'}
          />
        </TabsContent>

        <TabsContent value="customer" className="mt-6">
          <SequenceForm
            type="customer"
            sequence={sequences.customer}
            onUpdate={(seq) => handleUpdate('customer', seq)}
            onReset={() => handleReset('customer')}
            label={language === 'en' ? 'Customer Codes' : 'أكواد العملاء'}
          />
        </TabsContent>

        <TabsContent value="invoice" className="mt-6">
          <SequenceForm
            type="invoice"
            sequence={sequences.invoice}
            onUpdate={(seq) => handleUpdate('invoice', seq)}
            onReset={() => handleReset('invoice')}
            label={language === 'en' ? 'Invoice Numbers' : 'أرقام الفواتير'}
          />
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <SequenceForm
            type="payment"
            sequence={sequences.payment}
            onUpdate={(seq) => handleUpdate('payment', seq)}
            onReset={() => handleReset('payment')}
            label={language === 'en' ? 'Payment Numbers' : 'أرقام المدفوعات'}
          />
        </TabsContent>

        <TabsContent value="variationOrder" className="mt-6">
          <SequenceForm
            type="variationOrder"
            sequence={sequences.variationOrder}
            onUpdate={(seq) => handleUpdate('variationOrder', seq)}
            onReset={() => handleReset('variationOrder')}
            label={language === 'en' ? 'Variation Order Numbers' : 'أرقام أوامر التغيير'}
          />
        </TabsContent>

        <TabsContent value="claim" className="mt-6">
          <SequenceForm
            type="claim"
            sequence={sequences.claim}
            onUpdate={(seq) => handleUpdate('claim', seq)}
            onReset={() => handleReset('claim')}
            label={language === 'en' ? 'Claim Numbers' : 'أرقام المطالبات'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
