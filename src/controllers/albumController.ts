import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db, prisma } from '@models/prisma';
import { spotifyService } from '@services/spotifyService';
import { lastfmService } from '@services/lastfmService';

export const getAllAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, artistId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for Prisma
    const where: any = {};
    if (status) {
      where.status = status as string;
    }
    if (artistId) {
      where.artistId = artistId as string;
    }

    const albums = await db.getAlbums({ skip, take: limitNum, status: status as string | undefined });

    // Get total count for pagination
    const allAlbums = await db.getAlbums();
    const total = allAlbums.length;

    sendSuccess(
      res,
      {
        albums,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      'Albums retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get albums');
  }
};

export const getAlbumById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const album = await db.getAlbumById(id);

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    sendSuccess(res, album, 'Album retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album');
  }
};

export const getMyAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    const albums = await db.getAlbumsByArtistId(artist.id);
    sendSuccess(res, albums, 'Artist albums retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist albums');
  }
};

export const createAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { title, tracks, releaseDate } = req.body;

    if (!title || !tracks || tracks.length === 0) {
      sendError(res, 'Title and at least one track are required', 400);
      return;
    }

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const newAlbum = await db.createAlbum({
      title,
      artistId: artist.id,
      artistName: artist.name,
      releaseDate: new Date(releaseDate || Date.now()),
      status: 'draft',
      totalStreams: 0,
      revenue: 0,
      tracks: tracks.map((track: any, idx: number) => ({
        title: track.title,
        streams: 0,
        revenue: 0,
      })),
    });

    sendSuccess(res, newAlbum, 'Album created successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to create album');
  }
};

export const updateAlbumStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      status,
      upc,
      albumId,
      youtubeId,
      rejectionReason,
      coverArt,
      releaseDate,
      title,
      artistId,
      artistName,
      // Metadata fields
      displayArtist,
      primaryArtists,
      featuringArtists,
      pYear,
      cYear,
      pLine,
      cLine,
      genre,
      subgenre,
    } = req.body;

    if (!status) {
      sendError(res, 'Status is required', 400);
      return;
    }

    const validStatuses = ['draft', 'submitted', 'approved', 'distributed', 'rejected'];
    if (!validStatuses.includes(status)) {
      sendError(res, 'Invalid status', 400);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Build update object based on status transition
    const updateData: any = { status };

    // When transitioning to 'submitted', expect UPC
    if (status === 'submitted' && upc) {
      updateData.upc = upc;
    }

    // When transitioning to 'approved', expect albumId
    if (status === 'approved' && albumId) {
      updateData.albumId = albumId;
    }

    // When transitioning to 'distributed', optionally accept youtubeId
    if (status === 'distributed' && youtubeId) {
      updateData.youtubeId = youtubeId;
    }

    // When transitioning to 'rejected', expect rejectionReason
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    // Allow updating UPC, albumId, youtubeId at any time
    if (upc !== undefined) {
      updateData.upc = upc === null ? null : (upc || undefined);
    }
    if (albumId !== undefined) {
      updateData.albumId = albumId === null ? null : (albumId || undefined);
    }
    if (youtubeId !== undefined) {
      updateData.youtubeId = youtubeId === null ? null : (youtubeId || undefined);
    }

    // Allow updating cover art and release date at any time
    if (coverArt !== undefined) {
      updateData.coverArt = coverArt === null ? null : (coverArt || undefined);
    }
    if (releaseDate) {
      updateData.releaseDate = new Date(releaseDate);
    }

    // Allow updating title at any time
    if (title) {
      updateData.title = title;
    }

    if (artistId !== undefined) {
      updateData.artistId = artistId || undefined;
    }
    if (artistName !== undefined) {
      updateData.artistName = artistName || undefined;
    }

    // Update metadata fields
    if (displayArtist !== undefined) {
      updateData.displayArtist = displayArtist || undefined;
    }
    if (primaryArtists !== undefined) {
      updateData.primaryArtists = primaryArtists || undefined;
    }
    if (featuringArtists !== undefined) {
      updateData.featuringArtists = featuringArtists || undefined;
    }
    if (pYear !== undefined) {
      updateData.pYear = pYear ? parseInt(pYear) : undefined;
    }
    if (cYear !== undefined) {
      updateData.cYear = cYear ? parseInt(cYear) : undefined;
    }
    if (pLine !== undefined) {
      updateData.pLine = pLine || undefined;
    }
    if (cLine !== undefined) {
      updateData.cLine = cLine || undefined;
    }
    if (genre !== undefined) {
      updateData.genre = genre || undefined;
    }
    if (subgenre !== undefined) {
      updateData.subgenre = subgenre || undefined;
    }

    const updatedAlbum = await db.updateAlbum(id, updateData);

    sendSuccess(res, updatedAlbum, 'Album status updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update album status');
  }
};

export const getAlbumStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const albums = await db.getAlbums();

    const stats = {
      totalAlbums: albums.length,
      distributedAlbums: albums.filter((a) => a.status === 'distributed').length,
      approvedAlbums: albums.filter((a) => a.status === 'approved').length,
      submittedAlbums: albums.filter((a) => a.status === 'submitted').length,
      totalStreams: albums.reduce((sum, a) => sum + a.totalStreams, 0),
      totalRevenue: albums.reduce((sum, a) => sum + a.revenue, 0),
    };

    sendSuccess(res, stats, 'Album stats retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album stats');
  }
};

export const createAlbumAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can use this endpoint', 403);
      return;
    }

    const {
      title,
      artistId,
      coverArt,
      releaseDate,
      upc,
      displayArtist,
      primaryArtists,
      featuringArtists,
      pYear,
      cYear,
      pLine,
      cLine,
      genre,
      subgenre,
      albumId: spotifyAlbumId,
      youtubeId,
    } = req.body;

    if (!title || !artistId) {
      sendError(res, 'Title and artistId are required', 400);
      return;
    }

    const artist = await db.getArtistById(artistId);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const newAlbum = await db.createAlbum({
      title,
      artistId: artist.id,
      artistName: artist.name,
      coverArt: coverArt || undefined,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      upc: upc || undefined,
      albumId: spotifyAlbumId || undefined,
      youtubeId: youtubeId || undefined,
      displayArtist: displayArtist || undefined,
      primaryArtists: primaryArtists || undefined,
      featuringArtists: featuringArtists || undefined,
      pYear: pYear ? parseInt(pYear) : undefined,
      cYear: cYear ? parseInt(cYear) : undefined,
      pLine: pLine || undefined,
      cLine: cLine || undefined,
      genre: genre || undefined,
      subgenre: subgenre || undefined,
      status: 'draft',
      totalStreams: 0,
      revenue: 0,
    });

    sendSuccess(res, newAlbum, 'Album created successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to create album');
  }
};

// ============ ALBUM DETAIL ============
export const getAlbumDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const album = await db.getAlbumDetail(id);

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    sendSuccess(res, album, 'Album detail retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album detail');
  }
};

// ============ COLLABORATORS ============
export const addCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { artistId, role } = req.body;

    if (!artistId) {
      sendError(res, 'artistId is required', 400);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Can't add the main artist as collaborator
    if (album.artistId === artistId) {
      sendError(res, 'Cannot add the main artist as a collaborator', 400);
      return;
    }

    const collaborator = await db.addCollaborator(id, artistId, role || 'featured');
    sendSuccess(res, collaborator, 'Collaborator added successfully', 201);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      sendError(res, 'This artist is already a collaborator', 409);
      return;
    }
    handleError(res, error, 'Failed to add collaborator');
  }
};

export const removeCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id, artistId } = req.params;
    await db.removeCollaborator(id, artistId);
    sendSuccess(res, null, 'Collaborator removed successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to remove collaborator');
  }
};

// ============ TRACK PLATFORMS ============
export const updateTrackPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { trackId } = req.params;
    const { platform, streams, copyrightFlag, url } = req.body;

    if (!platform) {
      sendError(res, 'platform is required', 400);
      return;
    }

    const validPlatforms = ['spotify', 'youtube_music'];
    if (!validPlatforms.includes(platform)) {
      sendError(res, 'Invalid platform', 400);
      return;
    }

    const result = await db.upsertTrackPlatform(trackId, platform, {
      streams: streams !== undefined ? parseInt(streams) : undefined,
      copyrightFlag: copyrightFlag !== undefined ? Boolean(copyrightFlag) : undefined,
      url: url !== undefined ? url : undefined,
    });

    sendSuccess(res, result, 'Track platform updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update track platform');
  }
};

// ============ REVENUE SPLITS ============
export const getRevenueSplits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const splits = await db.getRevenueSplits(id);
    sendSuccess(res, splits, 'Revenue splits retrieved', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get revenue splits');
  }
};

export const updateRevenueSplits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { splits } = req.body;

    if (!splits || !Array.isArray(splits)) {
      sendError(res, 'splits array is required', 400);
      return;
    }

    // Validate total = 100
    const total = splits.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      sendError(res, `Total percentage must equal 100% (currently ${total}%)`, 400);
      return;
    }

    const result = await db.setRevenueSplits(id, splits);
    sendSuccess(res, result, 'Revenue splits updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update revenue splits');
  }
};
// ============ PLATFORM REVENUE & PAYMENTS ============
export const updatePlatformRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, platform } = req.params;
    const { totalRevenue } = req.body;

    if (totalRevenue === undefined || typeof totalRevenue !== 'number') {
      sendError(res, 'Valid totalRevenue number is required', 400);
      return;
    }

    const result = await db.upsertPlatformRevenue(id, platform, totalRevenue);
    sendSuccess(res, result, 'Platform revenue updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update platform revenue');
  }
};

export const addPlatformPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, platform } = req.params;
    const { amount, note } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      sendError(res, 'Valid payment amount > 0 is required', 400);
      return;
    }

    const result = await db.addPlatformPayment(id, platform, amount, note);
    sendSuccess(res, result, 'Platform payment logged successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to log platform payment');
  }
};

// ============ TRACK METADATA ============
export const updateTrackMetadata = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { trackId } = req.params;
    const {
      title,
      isrc,
      featuring,
      mixTitle,
      primaryArtists,
      remixingArtists,
      composers,
      lyricists,
      language,
      pYear,
      cYear,
      pLine,
      cLine,
      genre,
      subgenre,
      hasExplicitContent,
    } = req.body;

    const track = await db.getTrackById(trackId);
    if (!track) {
      sendError(res, 'Track not found', 404);
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (isrc !== undefined) updateData.isrc = isrc || null;
    if (featuring !== undefined) updateData.featuring = featuring || null;
    if (mixTitle !== undefined) updateData.mixTitle = mixTitle || null;
    if (primaryArtists !== undefined) updateData.primaryArtists = primaryArtists || null;
    if (remixingArtists !== undefined) updateData.remixingArtists = remixingArtists || null;
    if (composers !== undefined) updateData.composers = composers || null;
    if (lyricists !== undefined) updateData.lyricists = lyricists || null;
    if (language !== undefined) updateData.language = language || null;
    if (pYear !== undefined) updateData.pYear = pYear ? parseInt(pYear) : null;
    if (cYear !== undefined) updateData.cYear = cYear ? parseInt(cYear) : null;
    if (pLine !== undefined) updateData.pLine = pLine || null;
    if (cLine !== undefined) updateData.cLine = cLine || null;
    if (genre !== undefined) updateData.genre = genre || null;
    if (subgenre !== undefined) updateData.subgenre = subgenre || null;
    if (hasExplicitContent !== undefined) updateData.hasExplicitContent = Boolean(hasExplicitContent);

    const updated = await db.updateTrack(trackId, updateData);
    sendSuccess(res, updated, 'Track metadata updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update track metadata');
  }
};

// ============ DELETE ALBUM ============
export const deleteAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const album = await db.getAlbumById(id);

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    await db.deleteAlbum(id);
    sendSuccess(res, null, 'Album deleted successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to delete album');
  }
};

// ============ SPOTIFY & LASTFM INTEGRATION ============
export const getAlbumSpotifyTracks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get album from database
    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Check if album is approved and has Spotify album ID
    if (album.status !== 'approved' && album.status !== 'distributed') {
      sendError(res, 'Only approved or distributed albums can fetch Spotify tracks', 400);
      return;
    }

    if (!album.albumId) {
      sendError(res, 'Album does not have a Spotify ID', 400);
      return;
    }

    // Fetch album metadata from Spotify
    const spotifyAlbum = await spotifyService.getAlbum(album.albumId);

    // Fetch tracks from Spotify
    const spotifyTracks = await spotifyService.getAlbumTracks(album.albumId);

    // Enrich with LastFM stream data
    const tracksWithStreams = await Promise.all(
      spotifyTracks.map(async (track) => {
        let lastfmData = null;
        try {
          // Try to get track info from LastFM
          lastfmData = await lastfmService.getTrack(track.artistName, track.name);
        } catch (error) {
          console.warn(`Failed to fetch LastFM data for ${track.artistName} - ${track.name}:`, error);
        }

        return {
          spotifyId: track.id,
          title: track.name,
          artist: track.artistName,
          duration: Math.round(track.duration / 1000), // Convert ms to seconds
          previewUrl: track.previewUrl,
          spotifyUrl: track.externalUrl,
          streams: lastfmData?.playcount || 0,
          youtubeStreams: 0, // YouTube Music streams (placeholder - no public API available)
          listeners: lastfmData?.listeners || 0,
          spotifyPopularity: track.popularity,
          lastfmUrl: lastfmData?.url,
        };
      })
    );

    // Return both album metadata and tracks
    const response = {
      album: {
        title: spotifyAlbum?.name,
        artist: spotifyAlbum?.artists?.map((a: any) => a.name).join(', '),
        releaseDate: spotifyAlbum?.release_date,
        totalTracks: spotifyAlbum?.total_tracks,
        genres: spotifyAlbum?.genres,
        images: spotifyAlbum?.images,
      },
      tracks: tracksWithStreams,
    };

    sendSuccess(res, response, 'Album tracks and metadata retrieved successfully', 200);
  } catch (error) {
    console.error('Get album Spotify tracks error:', error);
    handleError(res, error, 'Failed to fetch album tracks');
  }
};

// ============ REVENUE PAYMENTS & SUMMARY ============

export const getAlbumPaymentSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const album = await db.getAlbumDetail(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Get all system artists to match by name
    const systemArtists = await prisma.artist.findMany({
      where: { isActive: true }
    });

    // Resolve custom names to system artist names if a match is found
    const resolveName = (name: string): string => {
      const trimmed = name.trim();
      if (!trimmed) return '';

      // Look up system artist by name (case-insensitive)
      let systemArtist = systemArtists.find(
        (a) => a.name.toLowerCase() === trimmed.toLowerCase()
      );

      // Look up system artist by composerName (case-insensitive)
      if (!systemArtist) {
        systemArtist = systemArtists.find(
          (a) => a.composerName && a.composerName.toLowerCase() === trimmed.toLowerCase()
        );
      }

      if (systemArtist) {
        return systemArtist.name;
      }
      return trimmed;
    };

    // We will extract all involved artists and their roles
    // Map of artist name -> Set of roles
    const artistRolesMap = new Map<string, Set<string>>();

    const addArtistRole = (name: string, role: string) => {
      const resolved = resolveName(name);
      if (!resolved) return;
      if (!artistRolesMap.has(resolved)) {
        artistRolesMap.set(resolved, new Set());
      }
      artistRolesMap.get(resolved)!.add(role);
    };

    // Add album-level primary artist
    if (album.artistName) {
      addArtistRole(album.artistName, 'primary');
    }

    // Add track-level artists
    for (const track of album.tracks) {
      if (track.primaryArtists) {
        track.primaryArtists.split(',').forEach((name) => addArtistRole(name, 'primary'));
      }
      if (track.featuring) {
        track.featuring.split(',').forEach((name) => addArtistRole(name, 'featuring'));
      }
      if (track.remixingArtists) {
        track.remixingArtists.split(',').forEach((name) => addArtistRole(name, 'remixing'));
      }
      if (track.composers) {
        track.composers.split(',').forEach((name) => addArtistRole(name, 'composer'));
      }
      if (track.lyricists) {
        track.lyricists.split(',').forEach((name) => addArtistRole(name, 'lyricist'));
      }
    }

    // Compute stats for each artist
    const totalRevenue = album.revenue || 0;
    const paymentLogDetails = (album as any).paymentLogDetails || [];
    const paymentLogs = paymentLogDetails.map((detail: any) => ({
      id: detail.paymentLog.id,
      artistId: detail.paymentLog.artistId,
      amount: detail.amount,
      paypalAccount: detail.paymentLog.paypalAccount,
      transactionId: detail.paymentLog.transactionId,
      receiptUrl: detail.paymentLog.receiptUrl,
      note: detail.paymentLog.note,
      paidAt: detail.paymentLog.paidAt,
      artist: detail.paymentLog.artist,
    }));

    const artistsList = [];

    for (const [name, rolesSet] of artistRolesMap.entries()) {
      const roles = Array.from(rolesSet);
      // Try to find matching system artist by name (case-insensitive)
      const systemArtist = systemArtists.find(
        (a) => a.name.toLowerCase() === name.toLowerCase()
      );

      let isSystem = false;
      let artistId = null;
      let paypalAccount = '';
      let composerName = '';
      let percentage = 0;
      let share = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;

      if (systemArtist) {
        isSystem = true;
        artistId = systemArtist.id;
        paypalAccount = systemArtist.paypalAccount || '';
        composerName = systemArtist.composerName || '';

        // Find split percentage
        const split = album.revenueSplits.find((s) => s.artistId === systemArtist.id);
        percentage = split ? split.percentage : 0;
        share = totalRevenue * (percentage / 100);

        // Find total paid to this artist for this album
        totalPaid = paymentLogs
          .filter((p: any) => p.artistId === systemArtist.id)
          .reduce((sum: number, p: any) => sum + p.amount, 0);

        totalUnpaid = share - totalPaid;
      }

      artistsList.push({
        name,
        roles,
        isSystem,
        artistId,
        paypalAccount,
        composerName,
        percentage,
        share,
        totalPaid,
        totalUnpaid,
      });
    }

    const totalPaidAlbum = paymentLogs.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalUnpaidAlbum = totalRevenue - totalPaidAlbum;

    sendSuccess(
      res,
      {
        albumId: album.id,
        albumTitle: album.title,
        totalRevenue,
        totalPaid: totalPaidAlbum,
        totalUnpaid: totalUnpaidAlbum,
        artists: artistsList,
        paymentLogs,
      },
      'Album payment summary retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get album payment summary');
  }
};

export const addAlbumPaymentLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { artistId, amount, paypalAccount, transactionId, receiptUrl, note } = req.body;

    if (!artistId || !amount || amount <= 0) {
      sendError(res, 'Artist ID and valid positive payment amount are required', 400);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const artist = await db.getArtistById(artistId);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const log = await prisma.paymentLog.create({
      data: {
        artistId,
        amount: parseFloat(amount),
        paypalAccount: paypalAccount || artist.paypalAccount || '',
        transactionId: transactionId || 'MANUAL-' + Date.now(),
        receiptUrl: receiptUrl || null,
        note: note || `Payment for album: ${album.title}`,
        details: {
          create: {
            albumId: id,
            amount: parseFloat(amount),
          }
        }
      },
      include: {
        artist: { select: { id: true, name: true } }
      }
    });

    sendSuccess(res, log, 'Payment logged successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to record payment');
  }
};

export const getAlbumPaymentLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const details = await prisma.paymentLogDetail.findMany({
      where: { albumId: id },
      include: {
        paymentLog: {
          include: {
            artist: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { paymentLog: { paidAt: 'desc' } }
    });

    const logs = details.map(d => ({
      id: d.paymentLog.id,
      albumId: d.albumId,
      artistId: d.paymentLog.artistId,
      amount: d.amount,
      paypalAccount: d.paymentLog.paypalAccount,
      transactionId: d.paymentLog.transactionId,
      receiptUrl: d.paymentLog.receiptUrl,
      note: d.paymentLog.note,
      paidAt: d.paymentLog.paidAt,
      artist: d.paymentLog.artist
    }));

    sendSuccess(res, logs, 'Payment logs retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get payment logs');
  }
};

export const addTrack = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params; // Album ID
    const album = await prisma.album.findUnique({
      where: { id },
      include: { tracks: true }
    });

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Create a new track with default fields inherited from album
    const newTrack = await prisma.track.create({
      data: {
        albumId: album.id,
        title: `Untitled Track`,
        genre: album.genre || 'Pop',
        subgenre: album.subgenre || 'Pop',
        pYear: album.releaseDate ? new Date(album.releaseDate).getFullYear() : new Date().getFullYear(),
        cYear: album.releaseDate ? new Date(album.releaseDate).getFullYear() : new Date().getFullYear(),
        pLine: album.pLine || '',
        cLine: album.cLine || '',
        primaryArtists: album.displayArtist || '',
        featuring: '',
        remixingArtists: '',
        composers: '',
        lyricists: '',
        language: 'English',
        hasExplicitContent: false,
      }
    });

    sendSuccess(res, newTrack, 'Track added successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to add track');
  }
};

export const accumulateAlbumRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
      sendError(res, 'A valid positive revenue amount is required', 400);
      return;
    }

    const album = await prisma.album.findUnique({
      where: { id }
    });

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const newRevenue = (album.revenue || 0) + amount;

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: {
        revenue: newRevenue
      }
    });

    sendSuccess(res, updatedAlbum, 'Album revenue accumulated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to accumulate album revenue');
  }
};

