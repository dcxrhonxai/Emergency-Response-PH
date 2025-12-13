import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGDPRCompliance } from '@/hooks/useGDPRCompliance';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

export const GDPRSettings = () => {
  const { exportUserData, deleteAccount, isExporting, isDeleting } = useGDPRCompliance();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmation === 'DELETE') {
      await deleteAccount();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Privacy & Data Management
        </CardTitle>
        <CardDescription>
          Manage your personal data in compliance with GDPR regulations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Export */}
        <div className="space-y-2">
          <h3 className="font-semibold">Export Your Data</h3>
          <p className="text-sm text-muted-foreground">
            Download a copy of all your personal data stored in the app, including your profile,
            emergency alerts, contacts, and medical information.
          </p>
          <Button
            onClick={exportUserData}
            disabled={isExporting}
            variant="outline"
            className="mt-2"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export My Data'}
          </Button>
        </div>

        {/* Account Deletion */}
        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold text-destructive">Delete Account</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-2">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your profile information</li>
                    <li>Emergency alerts history</li>
                    <li>Personal and doctor contacts</li>
                    <li>Medical records and medications</li>
                    <li>Service ratings and reviews</li>
                  </ul>
                  <p className="font-semibold pt-2">
                    Type "DELETE" to confirm:
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Forever'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
