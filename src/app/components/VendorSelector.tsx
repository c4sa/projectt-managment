import React, { useState, useEffect, useRef } from 'react';
import { dataStore, Vendor } from '../data/store';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Search, Plus, ChevronDown, Building2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (vendorId: string) => void;
  required?: boolean;
}

export function VendorSelector({ value, onChange, required = false }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    iban: '',
    vatNumber: '',
    specialty: '',
    contactPerson: '',
    address: '',
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors on mount
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const vendorsData = await dataStore.getVendors();
        setVendors(vendorsData);
      } catch (error) {
        console.error('Error loading vendors:', error);
        setVendors([]);
      }
    };
    loadVendors();
  }, []);

  // Get selected vendor
  const selectedVendor = vendors.find(v => v.id === value);

  // Filter vendors based on search
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleAddVendor = async () => {
    const vendor = await dataStore.addVendor(newVendor);
    const vendorsData = await dataStore.getVendors();
    setVendors(vendorsData);
    onChange(vendor.id);
    setShowAddDialog(false);
    setNewVendor({
      name: '',
      email: '',
      phone: '',
      bankName: '',
      iban: '',
      vatNumber: '',
      specialty: '',
      contactPerson: '',
      address: '',
    });
  };

  const isFormValid = newVendor.name && newVendor.bankName && newVendor.iban;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Vendor Display / Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className={selectedVendor ? 'text-gray-900' : 'text-gray-400'}>
            {selectedVendor ? `${selectedVendor.name} | ${selectedVendor.code}` : 'Select a Vendor'}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Vendor List */}
          <div className="overflow-y-auto max-h-60">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => {
                  onChange(vendor.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`px-3 py-3 cursor-pointer hover:bg-blue-50 border-b ${
                  value === vendor.id ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                    {vendor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {vendor.name} | <span className="text-gray-500">{vendor.code}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {vendor.specialty || 'General'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Vendor Button */}
          <div className="p-2 border-t bg-gray-50">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => {
                setShowAddDialog(true);
                setIsOpen(false);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Vendor
            </Button>
          </div>
        </div>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Vendor Name *</Label>
                <Input
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  placeholder="+966 XX XXX XXXX"
                />
              </div>

              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input
                  value={newVendor.bankName}
                  onChange={(e) => setNewVendor({ ...newVendor, bankName: e.target.value })}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="space-y-2">
                <Label>IBAN *</Label>
                <Input
                  value={newVendor.iban}
                  onChange={(e) => setNewVendor({ ...newVendor, iban: e.target.value })}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                />
              </div>

              <div className="space-y-2">
                <Label>VAT Number</Label>
                <Input
                  value={newVendor.vatNumber}
                  onChange={(e) => setNewVendor({ ...newVendor, vatNumber: e.target.value })}
                  placeholder="300000000000003"
                />
              </div>

              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input
                  value={newVendor.specialty}
                  onChange={(e) => setNewVendor({ ...newVendor, specialty: e.target.value })}
                  placeholder="e.g., MEP, Construction"
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={newVendor.contactPerson}
                  onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  placeholder="Enter vendor address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddVendor}
                disabled={!isFormValid}
                className="bg-[#7A1516] hover:bg-[#5A1012]"
              >
                Add Vendor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}