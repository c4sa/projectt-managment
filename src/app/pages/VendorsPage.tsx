import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { dataStore, Vendor } from '../data/store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Building2 } from 'lucide-react';

export function VendorsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load vendors on mount
  useEffect(() => {
    const loadVendors = async () => {
      const vendorsData = await dataStore.getVendors();
      setVendors(vendorsData);
    };
    loadVendors();
  }, []);

  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    iban: '',
    vatNumber: '',
    specialty: '',
    address: '',
    contactPerson: '',
  });

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateVendor = async () => {
    await dataStore.addVendor(newVendor);
    
    // Reload vendors from database
    const vendorsData = await dataStore.getVendors();
    setVendors(vendorsData);
    
    setDialogOpen(false);
    setNewVendor({
      name: '',
      email: '',
      phone: '',
      iban: '',
      vatNumber: '',
      specialty: '',
      address: '',
      contactPerson: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-gray-500 mt-1">Manage your vendor relationships</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor Name</Label>
                  <Input
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                    placeholder="Contact person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    placeholder="email@example.com"
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={newVendor.iban}
                    onChange={(e) => setNewVendor({ ...newVendor, iban: e.target.value })}
                    placeholder="SA0000000000000000000000"
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
              </div>

              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input
                  value={newVendor.specialty}
                  onChange={(e) => setNewVendor({ ...newVendor, specialty: e.target.value })}
                  placeholder="e.g., MEP, Construction, Fitout"
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  placeholder="Business address"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVendor} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  Add Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <Card 
            key={vendor.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/vendors/${vendor.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{vendor.name}</h3>
                  {vendor.specialty && (
                    <p className="text-sm text-gray-500">{vendor.specialty}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Contact:</span>
                  <span className="ml-2 font-medium">{vendor.contactPerson || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium">{vendor.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{vendor.phone}</span>
                </div>
                {vendor.vatNumber && (
                  <div>
                    <span className="text-gray-500">VAT:</span>
                    <span className="ml-2 font-medium">{vendor.vatNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No vendors found</p>
        </div>
      )}
    </div>
  );
}