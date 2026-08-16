"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, RefreshCcw } from "lucide-react";

export function RecycleBinContent() {
  const token = useAuthStore((state) => state.token);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  
  const [deletedStudents, setDeletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const hasFetched = React.useRef(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchRecycleBin = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/recycle-bin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeletedStudents(response.data.deletedStudents || []);
    } catch (error) {
      console.error("Failed to fetch recycle bin", error);
      toast.error("Failed to load recycle bin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchRecycleBin();
  }, [token, mounted, _hasHydrated]);

  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${BASE_URL}/recycle-bin/restore`, { id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Student restored successfully");
      fetchRecycleBin();
    } catch (error) {
      toast.error("Failed to restore student");
    }
  };

  const handleHardDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this student? This cannot be undone.")) return;
    try {
      await axios.delete(`${BASE_URL}/recycle-bin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Student permanently deleted");
      fetchRecycleBin();
    } catch (error) {
      toast.error("Failed to delete student permanently");
    }
  };

  if (!mounted || !_hasHydrated || loading) return <div className="flex justify-center p-12">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Recycle Bin</h1>
      <p className="text-gray-500">Manage soft-deleted students here. Restoring a student will allow them to login again.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Deleted Students</CardTitle>
        </CardHeader>
        <CardContent>
          {deletedStudents.length === 0 ? (
            <p className="text-gray-500 py-4 text-center">Recycle bin is empty.</p>
          ) : (
            <div className="divide-y">
              {deletedStudents.map((student) => (
                <div key={student.id} className="flex justify-between items-center py-4">
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <p className="text-xs text-red-500">Deleted: {new Date(student.deleted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRestore(student.id)}>
                      <RefreshCcw className="w-4 h-4 mr-2" /> Restore
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleHardDelete(student.id)}>
                      <Trash className="w-4 h-4 mr-2" /> Delete Permanently
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
