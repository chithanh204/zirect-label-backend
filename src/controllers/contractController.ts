import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { prisma } from '@models/prisma';

export const submitContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { artistName, email, subject, message, demoLink } = req.body;

    if (!artistName || !email || !subject || !message) {
      sendError(res, 'Artist name, email, subject, and message are required', 400);
      return;
    }

    const submission = await prisma.contractSubmission.create({
      data: {
        artistName,
        email,
        subject,
        message,
        demoLink,
      },
    });

    sendSuccess(res, submission, 'Contract application submitted successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to submit contract application');
  }
};

export const getContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const contracts = await prisma.contractSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, contracts, 'Contract applications retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get contract applications');
  }
};

export const updateContractStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'reviewed'].includes(status)) {
      sendError(res, 'Valid status is required ("new" or "reviewed")', 400);
      return;
    }

    const updated = await prisma.contractSubmission.update({
      where: { id },
      data: { status },
    });

    sendSuccess(res, updated, 'Contract application status updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update contract status');
  }
};
