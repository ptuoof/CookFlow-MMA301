import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { Recipe } from '../types/recipe';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleBadge } from './ui/AppleBadge';
import { useRecipes } from '../context/RecipeContext';

interface MyRecipesViewProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
}

export const MyRecipesView: React.FC<MyRecipesViewProps> = ({
  onSelectRecipe,
  onEditRecipe,
}) => {
  const { recipes, favoriteIds, deleteRecipe } = useRecipes();
  const [activeTab, setActiveTab] = useState<'favorites' | 'custom'>('favorites');

  const favoriteRecipes = recipes.filter((r) => favoriteIds.includes(r.id));
  const customRecipes = recipes.filter((r) => r.isCustom);

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(
      'Xóa công thức?',
      `Bạn có chắc muốn xóa công thức "${recipe.title}" vĩnh viễn không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: () => deleteRecipe(recipe.id),
        },
      ]
    );
  };

  const currentList = activeTab === 'favorites' ? favoriteRecipes : customRecipes;

  return (
    <View style={styles.container}>
      {/* Heron Minimalist Segmented Control */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmentedControl}>
          <Pressable
            onPress={() => setActiveTab('favorites')}
            style={[
              styles.segmentBtn,
              activeTab === 'favorites' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'favorites' && styles.segmentTextActive,
              ]}
            >
              ĐÃ LƯU [{favoriteRecipes.length}]
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('custom')}
            style={[
              styles.segmentBtn,
              activeTab === 'custom' && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'custom' && styles.segmentTextActive,
              ]}
            >
              TỰ TẠO [{customRecipes.length}]
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List / Empty State */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {currentList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptySquare}>
              <Text style={styles.emptySquareIcon}>∅</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'favorites'
                ? 'CHƯA CÓ CÔNG THỨC LƯU'
                : 'CHƯA CÓ CÔNG THỨC TỰ TẠO'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'favorites'
                ? 'Hãy thả tim các món bạn quan tâm tại trang Khám phá để lưu trữ vào kho cá nhân.'
                : 'Nhấn nút "+" ở thanh điều hướng để khởi tạo công thức nấu ăn của riêng bạn.'}
            </Text>
          </View>
        ) : (
          currentList.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelectRecipe(item)}
              style={({ pressed }) => [
                styles.card,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <AppleBadge label={item.category} variant="coral" />
                  <Text style={styles.timeText}>
                    ⏱ {item.prepTimeMinutes + item.cookTimeMinutes}P
                  </Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Sửa / Xóa */}
                {activeTab === 'custom' ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onEditRecipe(item);
                      }}
                      style={styles.actionBtnEdit}
                    >
                      <Text style={styles.actionBtnEditText}>SỬA</Text>
                    </Pressable>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      style={styles.actionBtnDelete}
                    >
                      <Text style={styles.actionBtnDeleteText}>XÓA</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  segmentBtnActive: {
    backgroundColor: HeronColors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: Radius.sm,
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: HeronColors.granite,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtnEdit: {
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  actionBtnEditText: {
    color: HeronColors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnDelete: {
    backgroundColor: HeronColors.brandLight,
    borderWidth: 1,
    borderColor: '#FFD8CF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  actionBtnDeleteText: {
    color: HeronColors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptySquare: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptySquareIcon: {
    fontSize: 22,
    color: HeronColors.surface,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: HeronColors.granite,
    textAlign: 'center',
  },
});
