import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { prisma } from '@models/prisma';
import * as xlsx from 'xlsx';

/**
 * Helper to dynamically find a column name matching a search term
 */
const findColumnName = (row: any, searchTerms: string[]): string | undefined => {
  const keys = Object.keys(row);
  for (const key of keys) {
    const keyLower = key.toLowerCase();
    for (const term of searchTerms) {
      if (keyLower.includes(term)) {
        return key;
      }
    }
  }
  return undefined;
};

// ============ IMPORT REVENUE EXCEL ============
export const importRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can import revenue', 403);
      return;
    }

    if (!req.file) {
      sendError(res, 'No Excel file uploaded', 400);
      return;
    }

    const { paymentMonth } = req.body;
    let paymentDate = new Date();
    if (paymentMonth) {
      const match = paymentMonth.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed month
        paymentDate = new Date(year, month, 15); // Set to the 15th to avoid timezone shifts
      } else {
        const parsed = new Date(paymentMonth);
        if (!isNaN(parsed.getTime())) {
          paymentDate = parsed;
        }
      }
    }

    console.log('Importing revenue from Excel buffer...');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      sendError(res, 'The uploaded Excel file contains no data rows', 400);
      return;
    }

    console.log(`Excel file parsed. Found ${data.length} rows.`);

    // Find column mapping from the first row
    const firstRow = data[0];
    
    // Explicit requested columns
    const musicServiceCol = "Music Service";
    const artistCol = "Artist";
    const albumTitleCol = "Album Title";
    const trackTitleCol = "Track Title";
    const upcCol = "UPC";
    const isrcCol = "ISRC";
    const toLabelCol = "To Label";
    
    // Units and territory columns
    const unitsCol = findColumnName(firstRow, ['units', 'streams', 'quantity', 'total units']);
    const territoryCol = findColumnName(firstRow, ['territory', 'region', 'country', 'country of sale']);

    const hasRequiredCols = 
      musicServiceCol in firstRow &&
      artistCol in firstRow &&
      albumTitleCol in firstRow &&
      trackTitleCol in firstRow &&
      upcCol in firstRow &&
      isrcCol in firstRow &&
      toLabelCol in firstRow;

    if (!hasRequiredCols) {
      sendError(res, 'Missing required columns in Excel sheet. (Required: Music Service, Artist, Album Title, Track Title, UPC, ISRC, To Label)', 400);
      return;
    }

    console.log(`Column mappings identified: 
      - Music Service: "${musicServiceCol}"
      - Artist: "${artistCol}"
      - Album Title: "${albumTitleCol}"
      - Track Title: "${trackTitleCol}"
      - UPC: "${upcCol}"
      - ISRC: "${isrcCol}"
      - To Label (Royalty): "${toLabelCol}"
      - Units/Streams: "${unitsCol || 'Not found'}"
      - Region/Territory: "${territoryCol || 'Not found'}"
    `);

    let processedCount = 0;
    let ignoredCount = 0;
    let totalRoyaltyDistributed = 0;
    let totalStreamsAdded = 0;
    const affectedArtistIds = new Set<string>();

    for (const row of data) {
      const musicServiceRaw = row[musicServiceCol];
      const isrcRaw = row[isrcCol];
      const upcRaw = row[upcCol];

      if (!musicServiceRaw || !isrcRaw || !upcRaw) {
        ignoredCount++;
        continue;
      }

      const musicService = String(musicServiceRaw).trim().toLowerCase();
      
      // Filter strictly for spotify and youtube
      const isSpotify = musicService === 'spotify - stream';
      const isYouTube = musicService === 'youtube - subscription' || musicService === 'youtube - youtube ads revenue';

      if (!isSpotify && !isYouTube) {
        ignoredCount++;
        continue;
      }

      const isrc = String(isrcRaw).trim().toUpperCase();
      const upc = String(upcRaw).trim();
      const royalty = parseFloat(row[toLabelCol]) || 0;
      const units = unitsCol ? (parseInt(row[unitsCol], 10) || 0) : 0;
      const territory = territoryCol ? (String(row[territoryCol] || '').trim()) : 'Unknown';
      const normalizedPlatform = isSpotify ? 'spotify' : 'youtube_music';

      // 1. Find the track by ISRC and UPC
      const track = await prisma.track.findFirst({
        where: {
          isrc: { equals: isrc, mode: 'insensitive' },
          album: {
            upc: { equals: upc, mode: 'insensitive' }
          }
        },
        include: {
          album: {
            include: {
              revenueSplits: {
                include: { artist: true }
              }
            }
          }
        }
      });

      if (!track) {
        ignoredCount++;
        continue;
      }

      processedCount++;
      totalRoyaltyDistributed += royalty;
      totalStreamsAdded += units;

      const album = track.album;
      const splits = album.revenueSplits;

      // 2. Perform Revenue Splitting
      for (const split of splits) {
        const artistShare = royalty * (split.percentage / 100);
        
        // Add share to artist's balance and totalRevenue
        await prisma.artist.update({
          where: { id: split.artistId },
          data: {
            balance: { increment: artistShare },
            totalRevenue: { increment: artistShare }
          }
        });
        
        affectedArtistIds.add(split.artistId);
      }

      // 3. Update track streams & revenue
      await prisma.track.update({
        where: { id: track.id },
        data: {
          streams: { increment: units },
          revenue: { increment: royalty }
        }
      });

      // 4. Update album streams & revenue
      await prisma.album.update({
        where: { id: album.id },
        data: {
          totalStreams: { increment: units },
          revenue: { increment: royalty }
        }
      });

      // 5. Update platform specific stream/revenue
      // Upsert TrackPlatform streams
      await prisma.trackPlatform.upsert({
        where: { trackId_platform: { trackId: track.id, platform: normalizedPlatform } },
        update: { streams: { increment: units } },
        create: { trackId: track.id, platform: normalizedPlatform, streams: units }
      });

      // Upsert PlatformRevenue
      await prisma.platformRevenue.upsert({
        where: { albumId_platform: { albumId: album.id, platform: normalizedPlatform } },
        update: { totalRevenue: { increment: royalty } },
        create: { albumId: album.id, platform: normalizedPlatform, totalRevenue: royalty }
      });

      // 6. Record Analytics for revenue charts
      for (const split of splits) {
        const artistShare = royalty * (split.percentage / 100);
        await prisma.analytics.create({
          data: {
            artistId: split.artistId,
            albumId: album.id,
            date: paymentDate, // Use the selected payment month date!
            streams: Math.round(units * (split.percentage / 100)),
            revenue: artistShare,
            platform: normalizedPlatform,
            region: territory || 'Global',
          }
        });
      }
    }

    // After updating everything, sync the main artist's stream counts
    for (const artistId of affectedArtistIds) {
      // Recalculate artist stream counts from their tracks
      const albums = await prisma.album.findMany({
        where: { artistId },
        select: { totalStreams: true }
      });
      const collabAlbums = await prisma.albumCollaborator.findMany({
        where: { artistId },
        include: { album: { select: { totalStreams: true } } }
      });
      
      const totalStreams = 
        albums.reduce((sum, a) => sum + a.totalStreams, 0) +
        collabAlbums.reduce((sum, c) => sum + c.album.totalStreams, 0);

      await prisma.artist.update({
        where: { id: artistId },
        data: { totalStreams }
      });
    }

    sendSuccess(
      res,
      {
        processedRows: processedCount,
        ignoredRows: ignoredCount,
        totalRoyaltyDistributed: parseFloat(totalRoyaltyDistributed.toFixed(6)),
        totalStreamsAdded,
        affectedArtists: affectedArtistIds.size,
      },
      'Revenue report imported and distributed successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to import revenue data');
  }
};

// ============ ARTIST PAYMENTS SUMMARY ============
export const getArtistPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can view artist payments', 403);
      return;
    }

    const artists = await prisma.artist.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const summary = artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      email: artist.email,
      avatar: artist.avatar,
      paypalAccount: artist.paypalAccount,
      paymentVerificationStatus: artist.paymentVerificationStatus,
      balance: parseFloat(artist.balance.toFixed(4)),
      totalPaid: parseFloat(artist.totalPaid.toFixed(4)),
      totalRevenue: parseFloat(artist.totalRevenue.toFixed(4)),
      status: artist.status,
      isActive: artist.isActive,
    }));

    sendSuccess(res, summary, 'Artist payment summary retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist payment summary');
  }
};

// ============ ARTIST UNPAID ALBUMS ============
export const getArtistUnpaidAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can view unpaid album revenues', 403);
      return;
    }

    const { id } = req.params; // Artist ID
    const artist = await prisma.artist.findUnique({
      where: { id }
    });

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    // Find all revenue splits for this artist
    const splits = await prisma.revenueSplit.findMany({
      where: { artistId: id },
      include: {
        album: {
          include: {
            paymentLogDetails: {
              include: { paymentLog: true }
            }
          }
        }
      }
    });

    const unpaidAlbums = [];

    for (const split of splits) {
      const album = split.album;
      const share = album.revenue * (split.percentage / 100);
      
      // Calculate how much has already been paid to this artist for this album
      const paid = album.paymentLogDetails
        .filter(detail => detail.paymentLog.artistId === id)
        .reduce((sum, detail) => sum + detail.amount, 0);

      const unpaid = share - paid;

      if (unpaid > 0.0001) {
        unpaidAlbums.push({
          albumId: album.id,
          title: album.title,
          coverArt: album.coverArt,
          totalRevenue: album.revenue,
          percentage: split.percentage,
          share: parseFloat(share.toFixed(4)),
          paid: parseFloat(paid.toFixed(4)),
          unpaid: parseFloat(unpaid.toFixed(4)),
        });
      }
    }

    sendSuccess(
      res,
      {
        artistId: artist.id,
        name: artist.name,
        paypalAccount: artist.paypalAccount,
        balance: parseFloat(artist.balance.toFixed(4)),
        unpaidAlbums,
      },
      'Unpaid albums retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get unpaid albums');
  }
};

// ============ PROCESS PAYOUT ============
export const processPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can process payouts', 403);
      return;
    }

    const { artistId, amount, paypalAccount, transactionId, receiptUrl, note, allocations } = req.body;

    if (!artistId || !amount || parseFloat(amount) <= 0) {
      sendError(res, 'Artist ID and valid positive payout amount are required', 400);
      return;
    }

    if (!transactionId) {
      sendError(res, 'PayPal transaction ID is required', 400);
      return;
    }

    const artist = await prisma.artist.findUnique({
      where: { id: artistId }
    });

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const paidAmount = parseFloat(amount);

    if (artist.balance < paidAmount - 0.01) {
      sendError(res, `Cannot payout more than the artist's available balance (${artist.balance.toFixed(2)})`, 400);
      return;
    }

    // Execute database operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the PaymentLog
      const log = await tx.paymentLog.create({
        data: {
          artistId,
          amount: paidAmount,
          paypalAccount: paypalAccount || artist.paypalAccount || '',
          transactionId,
          receiptUrl: receiptUrl || null,
          note: note || 'Payout processed via Admin panel',
        }
      });

      // 2. Handle Allocations to Albums
      let remaining = paidAmount;
      const logDetails = [];

      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        // Use custom allocations if provided
        for (const alloc of allocations) {
          const detailAmount = parseFloat(alloc.amount);
          if (detailAmount <= 0) continue;

          const detail = await tx.paymentLogDetail.create({
            data: {
              paymentLogId: log.id,
              albumId: alloc.albumId,
              amount: detailAmount
            }
          });
          logDetails.push(detail);
        }
      } else {
        // Automatically allocate to albums with unpaid revenue
        const splits = await tx.revenueSplit.findMany({
          where: { artistId },
          include: {
            album: {
              include: {
                paymentLogDetails: {
                  include: { paymentLog: true }
                }
              }
            }
          }
        });

        // Find and sort albums by unpaid balance
        const albumBalances = [];
        for (const split of splits) {
          const album = split.album;
          const share = album.revenue * (split.percentage / 100);
          const paid = album.paymentLogDetails
            .filter(detail => detail.paymentLog.artistId === artistId)
            .reduce((sum, detail) => sum + detail.amount, 0);

          const unpaid = share - paid;
          if (unpaid > 0.0001) {
            albumBalances.push({ albumId: album.id, unpaid });
          }
        }

        // Allocate to albums in sequence
        for (const albumBal of albumBalances) {
          if (remaining <= 0.0001) break;
          const allocateAmount = Math.min(remaining, albumBal.unpaid);
          
          const detail = await tx.paymentLogDetail.create({
            data: {
              paymentLogId: log.id,
              albumId: albumBal.albumId,
              amount: allocateAmount
            }
          });
          logDetails.push(detail);
          remaining -= allocateAmount;
        }

        // If there's still money remaining but no album balance left (e.g. slight math rounding), 
        // allocate the rest to the first album split
        if (remaining > 0.0001 && splits.length > 0) {
          const detail = await tx.paymentLogDetail.create({
            data: {
              paymentLogId: log.id,
              albumId: splits[0].albumId,
              amount: remaining
            }
          });
          logDetails.push(detail);
        }
      }

      // 3. Deduct balance and update totalPaid on artist
      const updatedArtist = await tx.artist.update({
        where: { id: artistId },
        data: {
          balance: { decrement: paidAmount },
          totalPaid: { increment: paidAmount }
        }
      });

      return { log, logDetails, artist: updatedArtist };
    });

    sendSuccess(res, result, 'Payout processed successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to process payout');
  }
};

// ============ VERIFY PAYPAL ============
export const verifyPayPal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can verify PayPal accounts', 403);
      return;
    }

    const { id } = req.params;
    const artist = await prisma.artist.findUnique({
      where: { id }
    });

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    if (!artist.paypalAccount) {
      sendError(res, 'Artist has not linked a PayPal account yet', 400);
      return;
    }

    const updated = await prisma.artist.update({
      where: { id },
      data: { paymentVerificationStatus: 'verified' }
    });

    sendSuccess(res, updated, 'PayPal account verified successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to verify PayPal account');
  }
};

// ============ UPDATE MY PAYPAL ============
export const updateMyPayPal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = await prisma.artist.findUnique({
      where: { userId: req.user.id }
    });

    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    const { paypalAccount } = req.body;

    if (!paypalAccount) {
      sendError(res, 'PayPal email account is required', 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalAccount)) {
      sendError(res, 'Invalid PayPal email address format', 400);
      return;
    }

    const updated = await prisma.artist.update({
      where: { id: artist.id },
      data: {
        paypalAccount,
        paymentVerificationStatus: 'pending' // Require admin approval after change!
      }
    });

    sendSuccess(res, updated, 'PayPal email updated. Pending admin verification.', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update PayPal account');
  }
};

// ============ GET MY PAYMENTS ============
export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = await prisma.artist.findUnique({
      where: { userId: req.user.id }
    });

    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    const payments = await prisma.paymentLog.findMany({
      where: { artistId: artist.id },
      include: {
        details: {
          include: {
            album: {
              select: { id: true, title: true, coverArt: true }
            }
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    sendSuccess(res, payments, 'Payment logs retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get payment history');
  }
};
