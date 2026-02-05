
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function InventoryTable() {
    // Basic mock data
    const medicines = [
        { id: 1, name: "Amoxicillin 500mg", barcode: "8901234567890", batch: "BATCH001", stock: 124, price: 12.50, status: "In Stock" },
        { id: 2, name: "Paracetamol 650mg", barcode: "8909876543210", batch: "BATCH002", stock: 45, price: 5.00, status: "Low Stock" },
        { id: 3, name: "Cetirizine 10mg",   barcode: "8901122334455", batch: "BATCH003", stock: 200, price: 3.50, status: "In Stock" },
        { id: 4, name: "Ibuprofen 400mg",   barcode: "8905566778899", batch: "BATCH004", stock: 0, price: 8.00, status: "Out of Stock" },
    ];

    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((med) => (
                <TableRow key={med.id}>
                  <TableCell className="font-medium">{med.name}</TableCell>
                  <TableCell className="font-mono text-xs">{med.barcode}</TableCell>
                  <TableCell>{med.batch}</TableCell>
                  <TableCell>{med.stock}</TableCell>
                  <TableCell>${med.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${med.stock === 0 ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' : 
                          med.stock < 50 ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 
                          'bg-success/10 text-success border-success/20 hover:bg-success/20'}
                      `}
                    >
                      {med.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
