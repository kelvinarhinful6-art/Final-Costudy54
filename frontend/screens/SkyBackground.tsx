import React from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export default function SkyBackground({ children }: { children: React.ReactNode }) {
  const { colors, isDarkMode } = useTheme();
  const iconColor = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View style={[styles.fill, { backgroundColor: colors.black }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.black} />
      <Ionicons name="book-outline" size={42} color={iconColor} style={styles.a} />
      <Ionicons name="pencil-outline" size={48} color={iconColor} style={styles.b} />
      <Ionicons name="school-outline" size={38} color={iconColor} style={styles.c} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  a: { position: 'absolute', top: 100, left: 24 },
  b: { position: 'absolute', top: 260, right: 26, transform: [{ rotate: '18deg' }] },
  c: { position: 'absolute', bottom: 160, left: 36 },
});

