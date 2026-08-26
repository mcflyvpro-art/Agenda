import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import { alpha, dt } from '../theme';
import { Appear, stagger } from '../parts/Motion';
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
 *
 * Les douze cartes arrivent en cascade plutôt que d'un bloc. Le retard
 * est minuscule — vingt millisecondes de l'une à l'autre, deux dixièmes
 * de seconde en tout — mais il suffit à donner à la grille un sens de
 * lecture, de janvier vers décembre, là où une apparition simultanée ne
 * dit au regard nulle part par où commencer.
 */
export function YearView({ year, countOn, selectedKey, onSelectDay, onOpenMonth }: Props) {
  const { ui } = useSettings();
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));
  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : -1;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Text style={styles.year}>{year}</Text>
        <View style={[styles.rule, { backgroundColor: dt.line }]} />
      </View>

      <View style={styles.grid}>
        {months.map((m, i) => {
          const isCurrent = m.getMonth() === currentMonth;
          return (
            <Appear
              key={m.getMonth()}
              delay={stagger(i, 20, 220)}
              style={
                [
                  styles.card,
                  isCurrent && {
                    boxShadow: `inset 0 0 0 1.5px ${alpha(ui.accent, 0.4)}`,
                    backgroundColor: alpha(ui.accent, 0.03),
                  },
                ] as any
              }
            >
              <MiniMonth
                month={m}
                cell={24}
                selectedKey={selectedKey}
                countOn={countOn}
                onSelectDay={onSelectDay}
                onPressTitle={() => onOpenMonth(m)}
              />
            </Appear>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: dt.gap.lg, gap: dt.gap.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: dt.gap.md },
  year: { fontSize: 26, fontWeight: '800', letterSpacing: -1.1, color: dt.ink },
  rule: { flex: 1, height: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dt.gap.md },
  card: {
    backgroundColor: dt.panel,
    borderRadius: dt.radius.md,
    padding: dt.gap.md,
    minWidth: 210,
    flexGrow: 1,
    flexBasis: 210,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: dt.line,
    ...dt.shadow.flat,
  },
});
