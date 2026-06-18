import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class PharmacyController {
  // --- Medicine Catalog ---
  static async listMedicines(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { search, category, includeStock } = req.query;

    try {
      const whereClause: any = {
        hospitalId,
        isActive: true,
      };

      if (category) {
        whereClause.category = category as string;
      }

      if (search) {
        whereClause.OR = [
          { brandName: { contains: search as string, mode: 'insensitive' } },
          { genericName: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const medicines = await prisma.medicine.findMany({
        where: whereClause,
        include: includeStock === 'true' ? {
          inventory: {
            where: { isActive: true, quantity: { gt: 0 } }
          }
        } : undefined,
        orderBy: { brandName: 'asc' },
      });

      // Map stock total if requested
      const result = medicines.map((m: any) => {
        if (includeStock === 'true') {
          const totalStock = m.inventory.reduce((acc: number, item: any) => acc + item.quantity, 0);
          return {
            ...m,
            availableStock: totalStock,
          };
        }
        return m;
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createMedicine(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { brandName, genericName, composition, category, manufacturer, drugSchedule, isPrescriptionRequired, unitOfMeasure, mrp, sellingPrice } = req.body;

    if (!brandName || !genericName || !category || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Missing required fields: brandName, genericName, category, sellingPrice' });
    }

    try {
      const id = `med_${ulid().toLowerCase()}`;
      const medicine = await prisma.medicine.create({
        data: {
          id,
          hospitalId,
          brandName,
          genericName,
          composition,
          category,
          manufacturer,
          drugSchedule,
          isPrescriptionRequired: isPrescriptionRequired !== undefined ? isPrescriptionRequired : true,
          unitOfMeasure: unitOfMeasure || 'Tablet',
          mrp,
          sellingPrice,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_MEDICINE',
        entityType: 'MEDICINE',
        entityId: id,
        description: `Added medicine: ${brandName} (${genericName})`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ success: true, data: medicine });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMedicineById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const medicine = await prisma.medicine.findFirst({
        where: { id, hospitalId },
        include: {
          inventory: {
            where: { isActive: true },
          },
        },
      });

      if (!medicine) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      return res.status(200).json({ success: true, data: medicine });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateMedicine(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const existing = await prisma.medicine.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      const updated = await prisma.medicine.update({
        where: { id },
        data: req.body,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteMedicine(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const existing = await prisma.medicine.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      await prisma.medicine.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(200).json({ success: true, message: 'Medicine deactivated' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Suppliers ---
  static async listSuppliers(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const suppliers = await prisma.supplier.findMany({
        where: { hospitalId, isActive: true },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json({ success: true, data: suppliers });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createSupplier(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { name, contactPerson, phone, email, address, drugLicenseNo, gstNo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    try {
      const id = `spl_${ulid().toLowerCase()}`;
      const supplier = await prisma.supplier.create({
        data: {
          id,
          hospitalId,
          name,
          contactPerson,
          phone,
          email,
          address,
          drugLicenseNo,
          gstNo,
        },
      });

      return res.status(201).json({ success: true, data: supplier });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateSupplier(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const existing = await prisma.supplier.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      const updated = await prisma.supplier.update({
        where: { id },
        data: req.body,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Inventory Management ---
  static async listInventory(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const inventory = await prisma.medicineInventory.findMany({
        where: { hospitalId, isActive: true },
        include: {
          medicine: true,
          supplier: true,
        },
        orderBy: { expiryDate: 'asc' },
      });

      return res.status(200).json({ success: true, data: inventory });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createInventoryBatch(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { medicineId, batchNumber, quantity, reorderLevel, manufactureDate, expiryDate, purchasePrice, supplierId, location } = req.body;

    if (!medicineId || !batchNumber || quantity === undefined || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields: medicineId, batchNumber, quantity, expiryDate' });
    }

    try {
      const id = `mib_${ulid().toLowerCase()}`;

      // Check if duplicate batch for medicine
      const existing = await prisma.medicineInventory.findFirst({
        where: { medicineId, batchNumber, hospitalId },
      });

      if (existing) {
        // Increment quantity instead of erroring out
        const updated = await prisma.medicineInventory.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity } }
        });

        // Add Transaction
        await prisma.inventoryTransaction.create({
          data: {
            id: `txn_${ulid().toLowerCase()}`,
            hospitalId,
            medicineId,
            inventoryId: existing.id,
            transactionType: 'PURCHASE',
            quantityChange: quantity,
            quantityBefore: existing.quantity,
            quantityAfter: existing.quantity + quantity,
            performedBy: req.user?.id || '',
            notes: 'Batch quantity incremented.',
          }
        });

        return res.status(200).json({ success: true, data: updated });
      }

      const batch = await prisma.medicineInventory.create({
        data: {
          id,
          hospitalId,
          medicineId,
          batchNumber,
          quantity,
          reorderLevel: reorderLevel || 50,
          manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
          expiryDate: new Date(expiryDate),
          purchasePrice,
          supplierId: supplierId || null,
          location,
        },
      });

      // Add Transaction
      await prisma.inventoryTransaction.create({
        data: {
          id: `txn_${ulid().toLowerCase()}`,
          hospitalId,
          medicineId,
          inventoryId: id,
          transactionType: 'PURCHASE',
          quantityChange: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          performedBy: req.user?.id || '',
        }
      });

      return res.status(201).json({ success: true, data: batch });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async adjustInventoryBatch(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { quantity } = req.body; // New absolute quantity

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    try {
      const existing = await prisma.medicineInventory.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Inventory batch not found' });
      }

      const difference = quantity - existing.quantity;

      const updated = await prisma.medicineInventory.update({
        where: { id },
        data: { quantity },
      });

      // Log transaction
      await prisma.inventoryTransaction.create({
        data: {
          id: `txn_${ulid().toLowerCase()}`,
          hospitalId,
          medicineId: existing.medicineId,
          inventoryId: id,
          transactionType: 'ADJUSTMENT',
          quantityChange: difference,
          quantityBefore: existing.quantity,
          quantityAfter: quantity,
          performedBy: req.user?.id || '',
          notes: 'Manual inventory adjustment.',
        }
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getLowStockAlerts(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      // Find all medicines where total stock is less than reorderLevel
      const medicines = await prisma.medicine.findMany({
        where: { hospitalId, isActive: true },
        include: {
          inventory: {
            where: { isActive: true }
          }
        }
      });

      const alerts = [];
      for (const m of medicines) {
        const totalStock = m.inventory.reduce((acc: number, item: any) => acc + item.quantity, 0);
        // Take standard reorder level from first batch or default 50
        const reorderLevel = m.inventory[0]?.reorderLevel ?? 50;

        if (totalStock < reorderLevel) {
          alerts.push({
            medicine: {
              id: m.id,
              brandName: m.brandName,
              genericName: m.genericName,
            },
            currentStock: totalStock,
            reorderLevel,
            urgency: totalStock === 0 ? 'CRITICAL' : 'WARNING',
            suggestedOrderQuantity: reorderLevel * 4,
          });
        }
      }

      return res.status(200).json({ success: true, data: { alerts, total: alerts.length } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getExpiringAlerts(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const expiringBatches = await prisma.medicineInventory.findMany({
        where: {
          hospitalId,
          isActive: true,
          quantity: { gt: 0 },
          expiryDate: {
            lte: ninetyDaysFromNow,
          },
        },
        include: {
          medicine: true,
        },
        orderBy: { expiryDate: 'asc' },
      });

      const alerts = expiringBatches.map((b: any) => {
        const days = Math.ceil((b.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return {
          medicine: {
            brandName: b.medicine.brandName,
            genericName: b.medicine.genericName,
          },
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate.toISOString().split('T')[0],
          daysUntilExpiry: days,
          currentStock: b.quantity,
          urgency: days <= 30 ? 'CRITICAL' : days <= 60 ? 'WARNING' : 'INFO',
        };
      });

      return res.status(200).json({ success: true, data: { alerts } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTransactions(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    try {
      const txns = await prisma.inventoryTransaction.findMany({
        where: { hospitalId },
        include: {
          medicine: true,
          inventory: true,
          performer: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: txns });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Prescription Fulfillment ---
  static async listPrescriptions(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { status } = req.query;

    try {
      const prescriptions = await prisma.prescription.findMany({
        where: {
          hospitalId,
          status: (status as string) || 'PENDING',
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // For each prescription, let's inject available stock levels
      const mapped = [];
      for (const rx of prescriptions) {
        const itemsWithStock = [];
        for (const item of rx.items) {
          const invs = await prisma.medicineInventory.findMany({
            where: {
              medicine: {
                OR: [
                  { brandName: { equals: item.medicineName, mode: 'insensitive' } },
                  { genericName: { equals: item.medicineName, mode: 'insensitive' } },
                ]
              },
              isActive: true,
              hospitalId,
            }
          });
          const totalStock = invs.reduce((acc: number, item: any) => acc + item.quantity, 0);
          itemsWithStock.push({
            ...item,
            availableStock: totalStock,
            isAvailable: totalStock >= (item.quantity || 0),
          });
        }
        mapped.push({
          ...rx,
          items: itemsWithStock,
        });
      }

      return res.status(200).json({ success: true, data: { prescriptions: mapped } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPrescriptionById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const rx = await prisma.prescription.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          items: true,
        },
      });

      if (!rx) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      // Inject stock levels
      const itemsWithStock = [];
      for (const item of rx.items) {
        const invs = await prisma.medicineInventory.findMany({
          where: {
            medicine: {
              OR: [
                { brandName: { equals: item.medicineName, mode: 'insensitive' } },
                { genericName: { equals: item.medicineName, mode: 'insensitive' } },
              ]
            },
            isActive: true,
            hospitalId,
          }
        });
        const totalStock = invs.reduce((acc: number, i: any) => acc + i.quantity, 0);
        itemsWithStock.push({
          ...item,
          availableStock: totalStock,
          isAvailable: totalStock >= (item.quantity || 0),
          batches: invs.map((i: any) => ({ id: i.id, batchNumber: i.batchNumber, quantity: i.quantity, expiryDate: i.expiryDate }))
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...rx,
          items: itemsWithStock
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async dispensePrescription(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dispense items details are required' });
    }

    try {
      const rx = await prisma.prescription.findFirst({
        where: { id, hospitalId },
        include: { items: true },
      });

      if (!rx) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      let dispensedTotalAmount = 0;
      let allFulfilled = true;
      let partialFulfilled = false;

      for (const item of items) {
        const rxItem = rx.items.find((i: any) => i.id === item.prescriptionItemId);
        if (!rxItem) {
          return res.status(400).json({ error: `Prescription item ${item.prescriptionItemId} not found` });
        }

        const quantityDispensed = item.quantityDispensed || 0;

        if (quantityDispensed > 0) {
          // Deduct from inventory using FEFO algorithm
          // Search for medicine
          const med = await prisma.medicine.findFirst({
            where: {
              hospitalId,
              OR: [
                { brandName: { equals: rxItem.medicineName, mode: 'insensitive' } },
                { genericName: { equals: rxItem.medicineName, mode: 'insensitive' } },
              ]
            }
          });

          if (!med) {
            return res.status(400).json({ error: `Medicine ${rxItem.medicineName} master catalog not found` });
          }

          const batches = await prisma.medicineInventory.findMany({
            where: { medicineId: med.id, quantity: { gt: 0 }, isActive: true, hospitalId },
            orderBy: { expiryDate: 'asc' }
          });

          let remaining = quantityDispensed;
          for (const batch of batches) {
            if (remaining <= 0) break;
            const deduct = Math.min(batch.quantity, remaining);
            await prisma.medicineInventory.update({
              where: { id: batch.id },
              data: { quantity: { decrement: deduct } }
            });

            // Log Transaction
            await prisma.inventoryTransaction.create({
              data: {
                id: `txn_${ulid().toLowerCase()}`,
                hospitalId,
                medicineId: med.id,
                inventoryId: batch.id,
                transactionType: 'DISPENSE',
                quantityChange: -deduct,
                quantityBefore: batch.quantity,
                quantityAfter: batch.quantity - deduct,
                prescriptionId: id,
                performedBy: req.user?.id || '',
              }
            });

            remaining -= deduct;
          }

          // Update Prescription Item Dispensed Qty
          await prisma.prescriptionItem.update({
            where: { id: rxItem.id },
            data: {
              dispensedQty: { increment: quantityDispensed },
              dispensedAt: new Date(),
              isAvailable: true,
            }
          });

          dispensedTotalAmount += Number(med.sellingPrice) * quantityDispensed;
          partialFulfilled = true;
        } else {
          allFulfilled = false;
        }
      }

      // Update Prescription Status
      const finalStatus = allFulfilled ? 'DISPENSED' : partialFulfilled ? 'PARTIAL' : 'PENDING';
      const updatedRx = await prisma.prescription.update({
        where: { id },
        data: {
          status: finalStatus,
          dispensedAt: partialFulfilled ? new Date() : null,
        },
      });

      // Log Dispense Record
      const dispenseRecordId = `dpr_${ulid().toLowerCase()}`;
      await prisma.dispenseRecord.create({
        data: {
          id: dispenseRecordId,
          hospitalId,
          prescriptionId: id,
          dispensedBy: req.user?.id || '',
          totalAmount: dispensedTotalAmount,
          notes,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'DISPENSE_PRESCRIPTION',
        entityType: 'PRESCRIPTION',
        entityId: id as string,
        description: `Dispensed medicines for prescription ${rx.prescriptionNo} (Status: ${finalStatus})`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, data: updatedRx });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
