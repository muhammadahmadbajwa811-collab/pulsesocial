import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, getCategoryColor } from '@/constants/Categories';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (category: string) => void;
}) {
  const colors = Colors[useColorScheme()];

  return (
    <View style={styles.wrap}>
      {CATEGORIES.map((category) => {
        const selected = value === category;
        const accent = getCategoryColor(category);
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? accent : colors.card,
                borderColor: selected ? accent : colors.border,
              },
            ]}>
            <Text style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}>
              {category}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
