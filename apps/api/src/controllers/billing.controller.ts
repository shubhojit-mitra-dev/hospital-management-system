import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

export class BillingController {
  // --- Invoices ---
  static async createInvoice(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { patientId, appointmentId, dueDate, notes, items } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    try {
      const invoiceId = `inv_${ulid().toLowerCase()}`;
      const count = await prisma.invoice.count({ where: { hospitalId } });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      // Calculate totals if items are provided
      let subtotal = 0;
      if (items && Array.isArray(items)) {
        items.forEach((item) => {
          subtotal += (item.quantity || 1) * (item.unitPrice || 0);
        });
      }

      const invoice = await prisma.invoice.create({
        data: {
          id: invoiceId,
          hospitalId,
          patientId,
          appointmentId: appointmentId || null,
          invoiceNumber,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
          subtotal,
          totalAmount: subtotal,
          balanceAmount: subtotal,
          status: 'DRAFT',
          createdBy: req.user?.id,
        },
      });

      // Add items if any
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const totalPrice = (item.quantity || 1) * (item.unitPrice || 0);
          await prisma.invoiceItem.create({
            data: {
              id: `ivi_${ulid().toLowerCase()}`,
              invoiceId,
              hospitalId,
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice,
              referenceType: item.referenceType || null,
              referenceId: item.referenceId || null,
            },
          });
        }
      }

      return res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listInvoices(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { status, patientId } = req.query;

    try {
      const whereClause: any = { hospitalId };
      if (status) whereClause.status = status as string;
      if (patientId) whereClause.patientId = patientId as string;

      const invoices = await prisma.invoice.findMany({
        where: whereClause,
        include: {
          patient: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: invoices });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getInvoiceById(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id } = req.params;

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
        include: {
          patient: true,
          items: true,
          payments: true,
          refunds: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateInvoice(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id } = req.params;
    const { discountAmount, discountPercent, taxPercent, notes, status } = req.body;

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status !== 'DRAFT' && status !== 'CANCELLED') {
        return res.status(400).json({ error: 'Only draft invoices can be updated' });
      }

      const discAmount = discountAmount !== undefined ? Number(discountAmount) : Number(invoice.discountAmount);
      const discPercent = discountPercent !== undefined ? Number(discountPercent) : Number(invoice.discountPercent);
      const taxPerc = taxPercent !== undefined ? Number(taxPercent) : Number(invoice.taxPercent);

      // Re-evaluate total
      const sub = Number(invoice.subtotal);
      const discount = discAmount > 0 ? discAmount : (sub * discPercent) / 100;
      const taxable = sub - discount;
      const tax = (taxable * taxPerc) / 100;
      const total = taxable + tax;

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          discountAmount: discAmount,
          discountPercent: discPercent,
          taxPercent: taxPerc,
          taxAmount: tax,
          totalAmount: total,
          balanceAmount: total - Number(invoice.amountPaid),
          notes: notes !== undefined ? notes : invoice.notes,
          status: status || invoice.status,
        },
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async finalizeInvoice(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id } = req.params;

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Invoice is already finalized' });
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'PENDING',
          finalizedAt: new Date(),
        },
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async addInvoiceItem(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id } = req.params; // Invoice ID
    const { itemType, description, quantity, unitPrice, referenceType, referenceId } = req.body;

    if (!description || !unitPrice) {
      return res.status(400).json({ error: 'Description and unit price are required' });
    }

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Can only add items to draft invoices' });
      }

      const qty = quantity || 1;
      const price = Number(unitPrice);
      const totalPrice = qty * price;

      await prisma.invoiceItem.create({
        data: {
          id: `ivi_${ulid().toLowerCase()}`,
          invoiceId: id,
          hospitalId,
          itemType,
          description,
          quantity: qty,
          unitPrice: price,
          totalPrice,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
        },
      });

      // Recalculate invoice subtotal
      const items = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
      const newSubtotal = items.reduce((acc, item) => acc + Number(item.totalPrice), 0);

      // Re-evaluate discount/taxes
      const sub = newSubtotal;
      const discount = Number(invoice.discountAmount) > 0 ? Number(invoice.discountAmount) : (sub * Number(invoice.discountPercent)) / 100;
      const taxable = sub - discount;
      const tax = (taxable * Number(invoice.taxPercent)) / 100;
      const total = taxable + tax;

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxAmount: tax,
          totalAmount: total,
          balanceAmount: total - Number(invoice.amountPaid),
        },
      });

      return res.status(200).json({ success: true, data: updatedInvoice });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async removeInvoiceItem(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id, itemId } = req.params; // Invoice ID and Item ID

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Can only modify draft invoices' });
      }

      const item = await prisma.invoiceItem.findFirst({
        where: { id: itemId, invoiceId: id },
      });

      if (!item) {
        return res.status(404).json({ error: 'Invoice item not found' });
      }

      await prisma.invoiceItem.delete({ where: { id: itemId } });

      // Recalculate invoice subtotal
      const items = await prisma.invoiceItem.findMany({ where: { invoiceId: id } });
      const newSubtotal = items.reduce((acc, item) => acc + Number(item.totalPrice), 0);

      const sub = newSubtotal;
      const discount = Number(invoice.discountAmount) > 0 ? Number(invoice.discountAmount) : (sub * Number(invoice.discountPercent)) / 100;
      const taxable = sub - discount;
      const tax = (taxable * Number(invoice.taxPercent)) / 100;
      const total = taxable + tax;

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxAmount: tax,
          totalAmount: total,
          balanceAmount: total - Number(invoice.amountPaid),
        },
      });

      return res.status(200).json({ success: true, data: updatedInvoice });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancelInvoice(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { id } = req.params;

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPatientInvoiceHistory(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { patientId } = req.params;

    try {
      const invoices = await prisma.invoice.findMany({
        where: { patientId, hospitalId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: invoices });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Payments ---
  static async recordCashPayment(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context is required' });
    }

    const { invoiceId, amount, notes } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ error: 'Invoice ID and Amount are required' });
    }

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const paymentCount = await prisma.payment.count({ where: { hospitalId } });
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;
      const paymentId = `pay_${ulid().toLowerCase()}`;

      const payment = await prisma.payment.create({
        data: {
          id: paymentId,
          hospitalId,
          invoiceId,
          patientId: invoice.patientId,
          paymentNumber,
          amount,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          collectedBy: req.user?.id,
          paidAt: new Date(),
          notes,
        },
      });

      // Update invoice amount paid & balance
      const newAmountPaid = Number(invoice.amountPaid) + Number(amount);
      const newBalance = Number(invoice.totalAmount) - newAmountPaid;
      const status = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceAmount: newBalance,
          status,
        },
      });

      return res.status(201).json({ success: true, data: payment });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async initiateGatewayPayment(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { invoiceId, amount, paymentMethod } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ error: 'Invoice ID and Amount are required' });
    }

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, hospitalId },
        include: { patient: true }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Mocking Razorpay Gateway Order Object creation
      const mockOrderId = `order_${ulid().toLowerCase()}`;

      return res.status(200).json({
        success: true,
        data: {
          gatewayOrderId: mockOrderId,
          amount: Number(amount) * 100, // in paise
          currency: 'INR',
          keyId: 'rzp_test_mockKey12345',
          prefill: {
            name: `${invoice.patient?.firstName} ${invoice.patient?.lastName}`,
            email: invoice.patient?.email || '',
            contact: invoice.patient?.phone || '',
          }
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyGatewayPayment(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { invoiceId, amount, gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

    if (!invoiceId || !amount || !gatewayOrderId || !gatewayPaymentId) {
      return res.status(400).json({ error: 'Missing payment details: invoiceId, amount, gatewayOrderId, gatewayPaymentId' });
    }

    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, hospitalId },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const paymentCount = await prisma.payment.count({ where: { hospitalId } });
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;
      const paymentId = `pay_${ulid().toLowerCase()}`;

      // Create completed payment record
      const payment = await prisma.payment.create({
        data: {
          id: paymentId,
          hospitalId,
          invoiceId,
          patientId: invoice.patientId,
          paymentNumber,
          amount,
          paymentMethod: 'UPI',
          gatewayName: 'RAZORPAY',
          gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      // Update invoice
      const newAmountPaid = Number(invoice.amountPaid) + Number(amount);
      const newBalance = Number(invoice.totalAmount) - newAmountPaid;
      const status = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceAmount: newBalance,
          status,
        },
      });

      return res.status(200).json({ success: true, data: payment });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPaymentsForInvoice(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { invoiceId } = req.params;

    try {
      const payments = await prisma.payment.findMany({
        where: { invoiceId, hospitalId },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: payments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async initiateRefund(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId;
    const { paymentId, refundAmount, reason } = req.body;

    if (!paymentId || !refundAmount || !reason) {
      return res.status(400).json({ error: 'Missing refund parameters: paymentId, refundAmount, reason' });
    }

    try {
      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, hospitalId },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment record not found' });
      }

      const refundId = `ref_${ulid().toLowerCase()}`;
      const refund = await prisma.refund.create({
        data: {
          id: refundId,
          hospitalId,
          paymentId,
          invoiceId: payment.invoiceId,
          refundAmount,
          reason,
          status: 'PROCESSED',
          initiatedBy: req.user?.id,
          processedAt: new Date(),
        },
      });

      // Update payment & invoice balances
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      const invoice = await prisma.invoice.findFirst({ where: { id: payment.invoiceId } });
      if (invoice) {
        const newAmountPaid = Number(invoice.amountPaid) - Number(refundAmount);
        const newBalance = Number(invoice.totalAmount) - newAmountPaid;
        await prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceAmount: newBalance,
            status: 'REFUNDED',
          },
        });
      }

      return res.status(201).json({ success: true, data: refund });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
