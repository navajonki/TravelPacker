import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import UncategorizedItemsDisplay from '@/components/UncategorizedItemsDisplay';

export default function UnassignedItemsTest() {
  const { id } = useParams();
  const packingListId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('category');
  
  // Direct fetching of unassigned items
  const { data: nullCategoryItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`],
    enabled: !!packingListId,
  });
  
  const { data: nullBagItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`],
    enabled: !!packingListId,
  });
  
  const { data: nullTravelerItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`],
    enabled: !!packingListId,
  });
  
  // Get all items
  const { data: allItems = [] } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/all-items`],
    enabled: !!packingListId,
  });
  
  // For safe array access
  const unassignedCategoryItems = Array.isArray(nullCategoryItems) ? nullCategoryItems : [];
  const unassignedBagItems = Array.isArray(nullBagItems) ? nullBagItems : [];
  const unassignedTravelerItems = Array.isArray(nullTravelerItems) ? nullTravelerItems : [];
  const items = Array.isArray(allItems) ? allItems : [];
  
  // Force refresh of all data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
    
    toast({
      title: "Data Refreshed",
      description: "The unassigned items data has been refreshed",
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Unassigned Items Test (List #{packingListId})</h1>
        <Button onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">API Response Summary</h2>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Item IDs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Items</TableCell>
                  <TableCell>{items.length}</TableCell>
                  <TableCell className="whitespace-normal break-all">
                    {items.map(item => item.id).join(', ')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>No Category</TableCell>
                  <TableCell>{unassignedCategoryItems.length}</TableCell>
                  <TableCell className="whitespace-normal break-all">
                    {unassignedCategoryItems.map(item => item.id).join(', ')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>No Bag</TableCell>
                  <TableCell>{unassignedBagItems.length}</TableCell>
                  <TableCell className="whitespace-normal break-all">
                    {unassignedBagItems.map(item => item.id).join(', ')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>No Traveler</TableCell>
                  <TableCell>{unassignedTravelerItems.length}</TableCell>
                  <TableCell className="whitespace-normal break-all">
                    {unassignedTravelerItems.map(item => item.id).join(', ')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">UncategorizedItemsDisplay Component Test</h2>
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="category">Category View</TabsTrigger>
          <TabsTrigger value="bag">Bag View</TabsTrigger>
          <TabsTrigger value="traveler">Traveler View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="category" className="space-y-4">
          <UncategorizedItemsDisplay 
            packingListId={packingListId} 
            viewContext="category" 
          />
        </TabsContent>
        
        <TabsContent value="bag" className="space-y-4">
          <UncategorizedItemsDisplay 
            packingListId={packingListId} 
            viewContext="bag" 
          />
        </TabsContent>
        
        <TabsContent value="traveler" className="space-y-4">
          <UncategorizedItemsDisplay 
            packingListId={packingListId} 
            viewContext="traveler" 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}