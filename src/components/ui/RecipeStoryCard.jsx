import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { HeronColors, Radius } from '../../constants/theme';

// Fixed 9:16 design surface. captureRef upscales it to 1080x1920 for Instagram Stories.
export const STORY_CARD_WIDTH = 270;
export const STORY_CARD_HEIGHT = 480;
export const RecipeStoryCard = forwardRef(({
  recipe,
  onImageLoad
}, ref) => {
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const accent = recipe.colorAccent || HeronColors.brand;
  const stats = [{
    key: 'THỜI GIAN',
    val: `${totalMinutes}′`
  }, {
    key: 'ĐỘ KHÓ',
    val: recipe.difficulty
  }, {
    key: 'KHẨU PHẦN',
    val: `${recipe.servings} người`
  }];
  if (recipe.calories) stats.push({
    key: 'KCAL',
    val: `${recipe.calories}`
  });
  return <View ref={ref} collapsable={false} style={styles.card}>
      {/* Brand header */}
      <View style={styles.brandRow}>
        <View style={styles.brandLogoBox}>
          <View style={styles.brandInnerDot} />
        </View>
        <Text style={styles.brandText}>COOKFLOW</Text>
        <View style={{
        flex: 1
      }} />
        <Text style={styles.brandMeta}>RECIPE CARD</Text>
      </View>

      {/* Photo */}
      <View style={styles.photoWrap}>
        <Image source={{
        uri: recipe.imageUrl
      }} style={styles.photo} resizeMode="cover" onLoadEnd={onImageLoad} crossOrigin="anonymous" />
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{recipe.category}</Text>
        </View>
        <View style={[styles.accentBar, {
        backgroundColor: accent
      }]} />
      </View>

      {/* Title & description */}
      <Text style={styles.title} numberOfLines={2}>
        {recipe.title}
      </Text>
      <Text style={styles.desc} numberOfLines={3}>
        {recipe.description}
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map((s, idx) => <View key={s.key} style={[styles.statCell, idx > 0 && styles.statDivider]}>
            <Text style={styles.statVal} numberOfLines={1}>
              {s.val}
            </Text>
            <Text style={styles.statKey}>{s.key}</Text>
          </View>)}
      </View>

      <View style={{
      flex: 1
    }} />

      {/* Footer watermark */}
      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {recipe.ingredients.length} NGUYÊN LIỆU • {recipe.steps.length} BƯỚC
        </Text>
        <Text style={styles.watermark}>CookFlow // Smart Assistant</Text>
      </View>
    </View>;
});
RecipeStoryCard.displayName = 'RecipeStoryCard';
const styles = StyleSheet.create({
  card: {
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
    // Square corners so the exported PNG has no transparent edges; the preview frame rounds it
    backgroundColor: HeronColors.primary,
    padding: 16,
    overflow: 'hidden'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  brandLogoBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
    backgroundColor: HeronColors.brand
  },
  brandText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5
  },
  brandMeta: {
    fontSize: 8,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 1
  },
  photoWrap: {
    height: 200,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: HeronColors.secondary,
    marginBottom: 14
  },
  photo: {
    width: '100%',
    height: '100%'
  },
  categoryPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '900',
    color: HeronColors.primary
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 26,
    marginBottom: 6
  },
  desc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#C9C9C3',
    marginBottom: 14
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.sm,
    paddingVertical: 8
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.14)'
  },
  statVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statKey: {
    fontSize: 7,
    fontWeight: '800',
    color: '#9A9A95',
    letterSpacing: 0.6
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: 10,
    gap: 4
  },
  footerMeta: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9A9A95',
    letterSpacing: 0.6
  },
  watermark: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 0.3
  }
});
