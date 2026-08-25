import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import { dt } from '../theme';
import { MiniMonth } from '../parts/MiniMonth';

type Props = {
  year: number;
  countOn: (key: string) => number;
  selectedKey: string;
  onSelectDay: (key: string) => void;
  onOpenMonth: (month: Date) => void;
};

/**
 * L'année entière, douze mois de front.
 *
 * Un téléphone doit empiler ces douze mois et les faire défiler ; un
 * écran large les pose tous ensemble, et c'est là que la vue prend son
 * sens — on voit l'année comme une seule image, les périodes chargées et
 * les creux d'un coup d'œil.
 */
export function YearView({ year, countOn, selectedKey, onSelectDay, onOpenMonth }: Props) {
  const { ui } = useSettings();
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.year, { color: ui.accent }]}>{year}</Text>
      <View style={styles.grid}>
        {months.map((m) => (
          <View key={m.getMonth()} style={styles.card}>
            <MiniMonth
              month={m}
              cell={24}
              selectedKey={selectedKey}
              countOn={countOn}
              onSelectDay={onSelectDay}
              onPressTitle={() => onOpenMonth(m)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: dt.gap.lg, gap: dt.gap.md },
  year: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dt.gap.md },
  card: {
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    minWidth: 208,
    flexGrow: 1,
    flexBasis: 208,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: dt.line,
  },
});
