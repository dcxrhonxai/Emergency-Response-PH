import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyService {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  is_national: boolean;
}

const EmergencyServicesManager = () => {
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<EmergencyService>>({
    name: '',
    type: 'police',
    phone: '',
    address: '',
    city: '',
    latitude: 14.5995,
    longitude: 120.9842,
    is_national: false,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to load services');
      console.error(error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('emergency_services')
      .insert([{
        name: formData.name,
        type: formData.type,
        phone: formData.phone,
        address: formData.address || null,
        city: formData.city || null,
        latitude: formData.latitude || 14.5995,
        longitude: formData.longitude || 120.9842,
        is_national: formData.is_national || false,
      }]);

    if (error) {
      toast.error('Failed to add service');
      console.error(error);
    } else {
      toast.success('Service added successfully');
      setShowAddForm(false);
      setFormData({
        name: '',
        type: 'police',
        phone: '',
        address: '',
        city: '',
        latitude: 14.5995,
        longitude: 120.9842,
        is_national: false,
      });
      loadServices();
    }
  };

  const handleUpdate = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;

    const { error } = await supabase
      .from('emergency_services')
      .update(service)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update service');
      console.error(error);
    } else {
      toast.success('Service updated successfully');
      setEditingId(null);
      loadServices();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    const { error } = await supabase
      .from('emergency_services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete service');
      console.error(error);
    } else {
      toast.success('Service deleted successfully');
      loadServices();
    }
  };

  const updateService = (id: string, field: keyof EmergencyService, value: any) => {
    setServices(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  if (loading) {
    return <div className="text-center py-8">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Emergency Services</h2>
            <p className="text-sm text-muted-foreground">Manage emergency service contacts</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? 'Cancel' : 'Add Service'}
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="p-4 mb-6 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Service name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="police">Police</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="all">All Emergencies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 2 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Manila"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <Switch
                  checked={formData.is_national}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_national: checked })}
                />
                <Label>National Hotline</Label>
              </div>
            </div>
            <Button onClick={handleAdd} className="mt-4">
              <Save className="w-4 h-4 mr-2" />
              Save Service
            </Button>
          </Card>
        )}

        {/* Services List */}
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id} className="p-4">
              {editingId === service.id ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={service.name}
                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                    placeholder="Name"
                  />
                  <Input
                    value={service.phone}
                    onChange={(e) => updateService(service.id, 'phone', e.target.value)}
                    placeholder="Phone"
                  />
                  <Input
                    value={service.address || ''}
                    onChange={(e) => updateService(service.id, 'address', e.target.value)}
                    placeholder="Address"
                  />
                  <Input
                    value={service.city || ''}
                    onChange={(e) => updateService(service.id, 'city', e.target.value)}
                    placeholder="City"
                  />
                  <div className="flex gap-2 col-span-2">
                    <Button onClick={() => handleUpdate(service.id)} size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.phone}</p>
                    {service.address && (
                      <p className="text-xs text-muted-foreground">{service.address}, {service.city}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {service.type}
                      </span>
                      {service.is_national && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                          National
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingId(service.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(service.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default EmergencyServicesManager;
