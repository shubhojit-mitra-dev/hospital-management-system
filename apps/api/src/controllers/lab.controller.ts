import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';
import { NotificationService } from '../services/notification.service.js';

export class LabController {
  // --- Lab Test Catalog ---
  static async listCatalog(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { category, search } = req.query;

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
          { testCode: { contains: search as string, mode: 'insensitive' } },
          { testName: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const catalog = await prisma.labTestCatalog.findMany({
        where: whereClause,
        orderBy: { testName: 'asc' },
      });

      return res.status(200).json({ success: true, data: catalog });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createCatalogItem(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { testCode, testName, category, description, normalRange, price, preparationInstructions, turnaroundHours } = req.body;

    if (!testCode || !testName || !category || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: testCode, testName, category, price' });
    }

    try {
      const id = `ltc_${ulid().toLowerCase()}`;
      const catalogItem = await prisma.labTestCatalog.create({
        data: {
          id,
          hospitalId,
          testCode,
          testName,
          category,
          description,
          normalRange: normalRange || {},
          price,
          preparationInstructions,
          turnaroundHours: turnaroundHours ? parseInt(turnaroundHours) : 24,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_LAB_CATALOG_ITEM',
        entityType: 'LAB_TEST_CATALOG',
        entityId: id,
        description: `Created lab test catalog item: ${testName} (${testCode})`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ success: true, data: catalogItem });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateCatalogItem(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const existing = await prisma.labTestCatalog.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Catalog item not found' });
      }

      const updated = await prisma.labTestCatalog.update({
        where: { id },
        data: req.body,
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'UPDATE_LAB_CATALOG_ITEM',
        entityType: 'LAB_TEST_CATALOG',
        entityId: id as string,
        description: `Updated lab test catalog item: ${existing.testName}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteCatalogItem(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const existing = await prisma.labTestCatalog.findFirst({
        where: { id, hospitalId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Catalog item not found' });
      }

      await prisma.labTestCatalog.update({
        where: { id },
        data: { isActive: false },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'DELETE_LAB_CATALOG_ITEM',
        entityType: 'LAB_TEST_CATALOG',
        entityId: id as string,
        description: `Deactivated lab test catalog item: ${existing.testName}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, message: 'Catalog item deactivated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Lab Orders ---
  static async createOrder(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { patientId, consultationId, priority, clinicalNotes, tests } = req.body;

    if (!patientId || !tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: patientId, tests list' });
    }

    try {
      // Find doctor record for user if user is doctor
      const doctorUser = await prisma.doctor.findFirst({
        where: { userId: req.user?.id, hospitalId },
      });
      const doctorId = doctorUser?.id;

      if (!doctorId) {
        return res.status(403).json({ error: 'Only registered doctors can create lab orders' });
      }

      const orderCount = await prisma.labOrder.count({
        where: { hospitalId },
      });
      const orderNumber = `LAB-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, '0')}`;
      const orderId = `lbo_${ulid().toLowerCase()}`;

      const labOrder = await prisma.labOrder.create({
        data: {
          id: orderId,
          hospitalId,
          patientId,
          doctorId,
          consultationId: consultationId || null,
          orderNumber,
          priority: priority || 'ROUTINE',
          clinicalNotes,
          status: 'PENDING',
        },
      });

      // Add order items
      const preparationInstructions: string[] = [];
      const orderItems = [];

      for (const t of tests) {
        const catalogItem = await prisma.labTestCatalog.findFirst({
          where: { id: t.testCatalogId, hospitalId },
        });

        if (!catalogItem) {
          return res.status(400).json({ error: `Lab test catalog item with ID ${t.testCatalogId} not found` });
        }

        const itemId = `lbi_${ulid().toLowerCase()}`;
        const item = await prisma.labOrderItem.create({
          data: {
            id: itemId,
            labOrderId: orderId,
            testCatalogId: catalogItem.id,
            testCode: catalogItem.testCode,
            testName: catalogItem.testName,
            price: catalogItem.price,
            status: 'PENDING',
          },
        });

        orderItems.push(item);
        if (catalogItem.preparationInstructions) {
          preparationInstructions.push(`${catalogItem.testCode}: ${catalogItem.preparationInstructions}`);
        }
      }

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'CREATE_LAB_ORDER',
        entityType: 'LAB_ORDER',
        entityId: orderId,
        description: `Created lab order ${orderNumber} for patient ID ${patientId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        success: true,
        data: {
          labOrder: {
            ...labOrder,
            tests: orderItems,
            preparationInstructions,
          },
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listOrders(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const priority = req.query.priority as string | undefined;

    try {
      const whereClause: any = {
        hospitalId,
      };

      if (status) {
        whereClause.status = status as string;
      }
      if (patientId) {
        whereClause.patientId = patientId as string;
      }
      if (priority) {
        whereClause.priority = priority as string;
      }

      const orders = await prisma.labOrder.findMany({
        where: whereClause,
        include: {
          patient: true,
          doctor: { include: { user: true } },
          items: true,
        },
        orderBy: [
          { priority: 'desc' }, // STAT and URGENT will be sorted on top if mapped correctly
          { createdAt: 'desc' },
        ],
      });

      return res.status(200).json({ success: true, data: orders });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          items: {
            include: {
              results: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      return res.status(200).json({ success: true, data: order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async collectSample(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: 'SAMPLE_COLLECTED',
          sampleCollectedAt: new Date(),
          sampleCollectedBy: req.user?.id,
        },
      });

      await prisma.labOrderItem.updateMany({
        where: { labOrderId: id },
        data: { status: 'SAMPLE_COLLECTED' },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'COLLECT_LAB_SAMPLE',
        entityType: 'LAB_ORDER',
        entityId: id as string,
        description: `Marked sample collected for lab order ${order.orderNumber}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async startProcessing(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: 'PROCESSING',
        },
      });

      await prisma.labOrderItem.updateMany({
        where: { labOrderId: id },
        data: { status: 'PROCESSING' },
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadResults(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;
    const { items, reportFileKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Results items are required' });
    }

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
        include: { doctor: true },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      let hasCritical = false;
      const criticalParameters: any[] = [];

      for (const item of items) {
        const orderItem = await prisma.labOrderItem.findFirst({
          where: { id: item.labOrderItemId, labOrderId: id },
        });

        if (!orderItem) {
          return res.status(400).json({ error: `OrderItem ${item.labOrderItemId} not found in this order` });
        }

        // Update item details
        await prisma.labOrderItem.update({
          where: { id: item.labOrderItemId },
          data: {
            status: 'COMPLETED',
            resultValues: item.resultValues,
            resultInterpretation: item.resultInterpretation,
            technicianNotes: item.technicianNotes,
            reportFileUrl: reportFileKey || null,
            resultEnteredAt: new Date(),
            resultEnteredBy: req.user?.id,
          },
        });

        // Insert parameter-level results
        if (item.results && Array.isArray(item.results)) {
          for (const resItem of item.results) {
            if (resItem.isCritical) {
              hasCritical = true;
              criticalParameters.push(resItem);
            }

            await prisma.labResult.create({
              data: {
                id: `lbr_${ulid().toLowerCase()}`,
                labOrderItemId: item.labOrderItemId,
                patientId: order.patientId,
                parameterName: resItem.parameterName,
                resultValue: resItem.resultValue,
                unit: resItem.unit || null,
                referenceMin: resItem.referenceMin || null,
                referenceMax: resItem.referenceMax || null,
                isAbnormal: resItem.isAbnormal || false,
                isCritical: resItem.isCritical || false,
              },
            });
          }
        }
      }

      // Update Order Status to COMPLETED
      const updatedOrder = await prisma.labOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Auto-create EMR Record
      await prisma.eMRRecord.create({
        data: {
          id: `emr_${ulid().toLowerCase()}`,
          patientId: order.patientId,
          hospitalId,
          consultationId: order.consultationId,
          uploadedBy: req.user?.id || '',
          recordType: 'LAB_REPORT',
          title: `Lab Report: ${order.orderNumber}`,
          description: `Diagnostic test results for order ${order.orderNumber}`,
          fileUrl: reportFileKey || '',
          fileName: `${order.orderNumber}.pdf`,
        },
      });

      // Audit log
      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'UPLOAD_LAB_RESULTS',
        entityType: 'LAB_ORDER',
        entityId: id as string,
        description: `Uploaded test results for lab order ${order.orderNumber} ${hasCritical ? '(CRITICAL VALUES DETECTED)' : ''}`,
        ipAddress: req.ip,
      });

      // Fetch patient userId
      const patientRecord = await prisma.patient.findUnique({
        where: { id: order.patientId },
        select: { userId: true, firstName: true, lastName: true }
      });

      // 1. Send Lab Report Ready to patient
      if (patientRecord?.userId) {
        await NotificationService.send({
          hospitalId: hospitalId || '',
          eventType: 'LAB_REPORT_READY',
          recipients: [patientRecord.userId],
          title: 'Lab Report Ready',
          body: `Your lab report for order ${order.orderNumber} is now ready for review.`,
          entityType: 'lab_order',
          entityId: id as string,
          actionUrl: `/my-labs`,
          templateData: {
            patientName: `${patientRecord.firstName} ${patientRecord.lastName}`,
            orderNumber: order.orderNumber,
            testName: items.map((it: any) => it.testName || 'Lab Test').join(', ')
          }
        });
      }
 
      // 2. Critical Value warning trigger
      if (hasCritical) {
        console.log(`[ALERT] CRITICAL VALUE DETECTED for patient ID ${order.patientId} on test parameters:`, criticalParameters);
        
        if (order.doctor?.userId) {
          await NotificationService.send({
            hospitalId: hospitalId || '',
            eventType: 'CRITICAL_LAB_VALUE',
            recipients: [order.doctor.userId],
            title: `CRITICAL Lab Value Alert - ${order.orderNumber}`,
            body: `Critical lab results detected for patient ${patientRecord?.firstName || ''} ${patientRecord?.lastName || ''} on order ${order.orderNumber}. Please review immediately.`,
            entityType: 'lab_order',
            entityId: id as string,
            actionUrl: `/lab/orders/${id}`,
            priority: 'CRITICAL',
            templateData: {
              patientName: `${patientRecord?.firstName || ''} ${patientRecord?.lastName || ''}`,
              orderNumber: order.orderNumber,
              criticalAlert: 'YES'
            }
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: updatedOrder,
        criticalAlert: hasCritical ? { parameters: criticalParameters } : null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async reviewOrder(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: 'REVIEWED',
          reviewedAt: new Date(),
          reviewedBy: req.user?.id,
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'REVIEW_LAB_ORDER',
        entityType: 'LAB_ORDER',
        entityId: id as string,
        description: `Doctor reviewed and approved lab order results: ${order.orderNumber}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancelOrder(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const id = req.params.id as string;

    try {
      const order = await prisma.labOrder.findFirst({
        where: { id, hospitalId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Lab order not found' });
      }

      const updated = await prisma.labOrder.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      await prisma.labOrderItem.updateMany({
        where: { labOrderId: id },
        data: { status: 'CANCELLED' },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId: hospitalId || undefined,
        action: 'CANCEL_LAB_ORDER',
        entityType: 'LAB_ORDER',
        entityId: id as string,
        description: `Cancelled lab order ${order.orderNumber}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPatientHistory(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    const patientId = req.params.patientId as string;

    try {
      const orders = await prisma.labOrder.findMany({
        where: { patientId, hospitalId },
        include: {
          items: {
            include: {
              results: true,
            },
          },
          doctor: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: orders });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
