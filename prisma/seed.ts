import { prisma } from '../lib/prisma'

async function main() {
  console.log('Seeding Dhanvantari mock data...')

  // 1. Create a Vendor
  const vendor = await prisma.vendor.create({
    data: {
      userId: 'dummy_seed_user_123',
      name: 'Sun Pharma Distributors',
      contactName: 'Rahul Verma',
      phone: '+91-9876543210',
      email: 'sales@sunpharma.dist.example.com',
    },
  })

  // 2. Create Medicines with Batches
  const med1 = await prisma.medicine.create({
    data: {
      userId: 'dummy_seed_user_123',
      name: 'Amoxicillin 500mg (Amoxil)',
      category: 'Antibiotics',
      description: 'Used to treat a wide variety of bacterial infections.',
      lowStockThreshold: 15,
      preferredVendorId: vendor.id,
      batches: {
        create: [
          {
            barcode: '1234567890121',
            batchNumber: 'AMX-2026-A1',
            quantity: 50,
            costPrice: 4.5,
            sellingPrice: 12.0,
            expiryDate: new Date('2026-12-31T00:00:00.000Z'),
          },
          {
            barcode: '1234567890122',
            batchNumber: 'AMX-2024-B2',
            quantity: 5,
            costPrice: 4.0,
            sellingPrice: 12.0,
            // Simulating an expired batch for testing locks
            expiryDate: new Date('2024-01-01T00:00:00.000Z'), 
          }
        ],
      },
    },
  })

  const med2 = await prisma.medicine.create({
    data: {
      userId: 'dummy_seed_user_123',
      name: 'Paracetamol 500mg (Dolo)',
      category: 'Painkillers',
      description: 'Common pain reliever and fever reducer.',
      lowStockThreshold: 50,
      preferredVendorId: vendor.id,
      batches: {
        create: [
          {
            barcode: '9876543210981',
            batchNumber: 'PARA-2027-X',
            quantity: 200,
            costPrice: 1.2,
            sellingPrice: 5.0,
            expiryDate: new Date('2027-06-15T00:00:00.000Z'),
          }
        ],
      },
    },
  })

  const med3 = await prisma.medicine.create({
    data: {
      userId: 'dummy_seed_user_123',
      name: 'Cetirizine 10mg (Zyrtec)',
      category: 'Antihistamines',
      description: 'Allergy medication.',
      lowStockThreshold: 20,
      // Intentionally low stock to test alerts
      batches: {
        create: [
          {
            barcode: '4561237890121',
            batchNumber: 'CET-2025-Y',
            quantity: 8, 
            costPrice: 2.0,
            sellingPrice: 8.5,
            expiryDate: new Date('2025-08-20T00:00:00.000Z'),
          }
        ],
      },
    },
  })

  console.log(`Created 3 medicines:`)
  console.log(`- ${med1.name}`)
  console.log(`- ${med2.name}`)
  console.log(`- ${med3.name}`)
  
  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
