import { Request, Response } from 'express';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EMRController {
  // Ensure upload directory exists
  private static getUploadDir() {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  static async upload(req: Request, res: Response) {
    const hospitalId = req.user?.hospitalId as string;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const {
      patientId,
      consultationId,
      recordType,
      title,
      description,
      fileName,
      fileMimeType,
      fileContentBase64, // Base64 content of file
      recordedDate,
      tags,
    } = req.body;

    if (!patientId || !recordType || !title || !fileName || !fileContentBase64) {
      return res.status(400).json({ error: 'Missing required EMR parameters: patientId, recordType, title, fileName, fileContentBase64' });
    }

    try {
      const uploadDir = EMRController.getUploadDir();
      const fileId = ulid().toLowerCase();
      const savedFileName = `${fileId}-${fileName}`;
      const filePath = path.join(uploadDir, savedFileName);

      // Write Base64 string to local public/uploads directory
      const buffer = Buffer.from(fileContentBase64, 'base64');
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${savedFileName}`;
      const record = await prisma.eMRRecord.create({
        data: {
          id: `emr_${fileId}`,
          patientId,
          hospitalId,
          consultationId: consultationId || null,
          uploadedBy: req.user?.id || '',
          recordType,
          title,
          description: description || null,
          fileUrl,
          fileName,
          fileSizeBytes: buffer.length,
          fileMimeType: fileMimeType || 'application/octet-stream',
          tags: tags || [],
          recordedDate: recordedDate ? new Date(recordedDate) : new Date(),
        },
      });

      await AuditService.recordLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        hospitalId,
        action: 'UPLOAD_EMR_RECORD',
        entityType: 'EMR_RECORD',
        entityId: record.id,
        description: `Uploaded EMR document "${title}" for patient id ${patientId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(record);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error during EMR upload' });
    }
  }

  static async listByPatient(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const records = await prisma.eMRRecord.findMany({
        where: { patientId, hospitalId, deletedAt: null },
        orderBy: { recordedDate: 'desc' },
      });
      return res.status(200).json(records);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async download(req: Request, res: Response) {
    const id = req.params.id as string;
    const hospitalId = req.user?.hospitalId as string;

    try {
      const record = await prisma.eMRRecord.findFirst({
        where: { id, hospitalId, deletedAt: null },
      });

      if (!record) {
        return res.status(404).json({ error: 'EMR record not found' });
      }

      const uploadDir = EMRController.getUploadDir();
      const savedFileName = record.fileUrl.replace('/uploads/', '');
      const filePath = path.join(uploadDir, savedFileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File binary not found on local storage' });
      }

      res.setHeader('Content-Type', record.fileMimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
      return res.sendFile(filePath);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async semanticSearch(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const hospitalId = req.user?.hospitalId as string;
    const query = req.query.query as string;

    try {
      // Cosmos or pgvector cosine similarity mock using title, description, and tags search
      const records = await prisma.eMRRecord.findMany({
        where: {
          patientId,
          hospitalId,
          deletedAt: null,
          OR: query ? [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } },
            { recordType: { contains: query, mode: 'insensitive' } },
          ] : undefined,
        },
        orderBy: { recordedDate: 'desc' },
      });

      return res.status(200).json(records);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
