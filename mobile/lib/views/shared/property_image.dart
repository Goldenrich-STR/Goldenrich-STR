import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../config.dart';
import '../../theme.dart';

class PropertyImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final String semanticLabel;
  final int? memCacheWidth;
  final int? memCacheHeight;

  const PropertyImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.semanticLabel = 'Property image unavailable',
    this.memCacheWidth,
    this.memCacheHeight,
  });

  static String? validPropertyImageUrl(String? value) {
    final raw = value?.trim();
    if (raw == null || raw.isEmpty) return null;
    final lower = raw.toLowerCase();
    if (lower.contains('example.com') ||
        lower.contains('images.unsplash.com') ||
        lower.contains('source.unsplash.com') ||
        lower.contains('images.pexels.com') ||
        lower.contains('picsum.photos') ||
        lower.contains('placeholder.com') ||
        lower.contains('placehold.co') ||
        lower.contains('dummyimage')) {
      return null;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    return AppConfig.resolveImageUrl(raw);
  }

  @override
  Widget build(BuildContext context) {
    final resolved = validPropertyImageUrl(imageUrl);
    final child = resolved == null
        ? _Placeholder(
            width: width, height: height, semanticLabel: semanticLabel)
        : Semantics(
            label: semanticLabel,
            image: true,
            child: CachedNetworkImage(
              imageUrl: resolved,
              width: width,
              height: height,
              fit: fit,
              memCacheWidth: memCacheWidth ?? _cacheWidthFor(width),
              memCacheHeight: memCacheHeight ?? _cacheHeightFor(height),
              fadeInDuration: const Duration(milliseconds: 120),
              fadeOutDuration: Duration.zero,
              useOldImageOnUrlChange: true,
              httpHeaders: const {
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              },
              placeholder: (context, url) => _Skeleton(
                width: width,
                height: height,
              ),
              errorWidget: (context, url, error) => _Placeholder(
                width: width,
                height: height,
                semanticLabel: semanticLabel,
              ),
            ),
          );

    if (borderRadius == null) return child;
    return ClipRRect(borderRadius: borderRadius!, child: child);
  }

  static int? _cacheWidthFor(double? width) {
    if (width == null || width.isInfinite || width <= 0) return null;
    return (width * 2).round().clamp(160, 900);
  }

  static int? _cacheHeightFor(double? height) {
    if (height == null || height.isInfinite || height <= 0) return null;
    return (height * 2).round().clamp(160, 900);
  }
}

class _Skeleton extends StatelessWidget {
  final double? width;
  final double? height;

  const _Skeleton({
    required this.width,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      color: AppTheme.stone,
      alignment: Alignment.center,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.72),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.image_outlined,
          color: AppTheme.charcoalMuted,
          size: 22,
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final double? width;
  final double? height;
  final String semanticLabel;

  const _Placeholder({
    required this.width,
    required this.height,
    required this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: Container(
        width: width,
        height: height,
        color: AppTheme.stone,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 42,
              height: 42,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 8),
            const Text(
              'Property image unavailable',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.charcoalMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
