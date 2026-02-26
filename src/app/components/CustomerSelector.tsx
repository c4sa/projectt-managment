import React, { useState, useRef, useEffect } from 'react';
import { dataStore, Customer } from '../data/store';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Search, UserPlus, ChevronDown } from 'lucide-react';
import { previewNextNumber } from '../utils/numberGenerator';

interface CustomerSelectorProps {
  value: string;
  onChange: (customerId: string) => void;
  onCustomersUpdate?: () => void;
}

export function CustomerSelector({ value, onChange, onCustomersUpdate }: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    vatNumber: '',
    contactPerson: '',
  });
  const [previewCode, setPreviewCode] = useState('');

  // Load customers on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersData = await dataStore.getCustomers();
        setCustomers(customersData);
      } catch (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
      }
    };
    loadCustomers();
  }, []);

  // Load preview code when add dialog opens
  useEffect(() => {
    if (showAddDialog) {
      previewNextNumber('customer').then(setPreviewCode);
    }
  }, [showAddDialog]);

  // Get selected customer
  const selectedCustomer = customers.find(c => c.id === value);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAddCustomer = async () => {
    const customer = await dataStore.addCustomer(newCustomer);
    const customersData = await dataStore.getCustomers();
    setCustomers(customersData);
    onChange(customer.id);
    setShowAddDialog(false);
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
      vatNumber: '',
      contactPerson: '',
    });
    onCustomersUpdate?.();
  };

  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A1516] focus:border-transparent"
        >
          <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-400'}>
            {selectedCustomer ? selectedCustomer.name : 'Select or add a customer'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="max-h-56 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onChange(customer.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors ${
                    value === customer.id ? 'bg-blue-500 hover:bg-blue-600' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      value === customer.id ? 'bg-white/20' : getAvatarColor(customer.name)
                    }`}
                  >
                    {getInitials(customer.name)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${value === customer.id ? 'text-white' : 'text-gray-900'}`}>
                      {customer.name} | {customer.code}
                    </div>
                    {customer.contactPerson && (
                      <div className={`text-sm ${value === customer.id ? 'text-white/80' : 'text-gray-500'}`}>
                        {customer.contactPerson}
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {filteredCustomers.length === 0 && searchTerm && (
                <div className="px-4 py-8 text-center text-gray-500">
                  No customers found
                </div>
              )}
            </div>

            {/* Add New Customer Button */}
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">New Customer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Code</Label>
              <Input
                value={previewCode}
                readOnly
                className="bg-blue-50 border-blue-200 text-blue-900 font-mono"
              />
              <p className="text-xs text-gray-500">Auto-generated</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={newCustomer.contactPerson}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contactPerson: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+966 XX XXX XXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Customer address"
              />
            </div>

            <div className="space-y-2">
              <Label>VAT Number</Label>
              <Input
                value={newCustomer.vatNumber}
                onChange={(e) => setNewCustomer({ ...newCustomer, vatNumber: e.target.value })}
                placeholder="VAT registration number"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                className="bg-[#7A1516] hover:bg-[#5A1012]"
                disabled={!newCustomer.name}
              >
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}