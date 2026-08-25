import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import type { DeskScale } from '../store/prefs';
import { dt } from '../theme';
import { IconButton, Press } from './Press';

/**
 * En dessous de cette largeur, la barre n'a plus la place de tout porter.
 *
 * Le panneau de détail prend 336 pixels et la barre latérale 236 : sur un
 * portable de 1100 de large, il ne reste que 528 pour la barre du haut.
 * Le sélecteur d'échelles est ce qui se retire avec le moins de perte —
 * les touches 1 à 5 et la palette y donnent toujours accès, alors que le
 * titre, lui, est la seule chose qui dise où l'on se trouve.
 */
const SCALES_MIN_WIDTH = 660;
/** Le titre ne descend jamais sous cette largeur : en dessous il s'empile lettre à lettre. */
const TITLE_MIN = 132;

const SCALES: { key: DeskScale; label: string; kbd: string }[] = [
  { key: 'year', label: 'Année', kbd: '1' },
  { key: 'month', label: 'Mois', kbd: '2' },
  { key: 'week', label: 'Semaine', kbd: '3' },
  { key: 'day', label: 'Jour', kbd: '4' },
  { key: 'list', label: 'Liste', kbd: '5' },
];

type Props = {
  title: string;
  subtitle?: string;
  scale: DeskScale;
  onScale: (s: DeskScale) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSearch: () => void;
  onCreate: () => void;
  inspector: boolean;
  onToggleInspector: () => void;
  showScales?: boolean;
  /** le tableau de bord et les idées ne se parcourent pas période par période */
  showNav?: boolean;
};

/**
 * La barre du haut : où l'on regarde, et à quelle échelle.
 *
 * Les cinq échelles sont posées à plat plutôt que cachées dans un menu —
 * il y a la place, et un sélecteur visible économise un clic à chaque
 * changement. Chaque bouton rappelle son raccourci : c'est ainsi qu'on
 * apprend à ne plus s'en servir.
 */
export function Topbar({
  title,
  subtitle,
  scale,
  onScale,
  onPrev,
  onNext,
  onToday,
  onSearch,
  onCreate,
  inspector,
  onToggleInspector,
  showScales = true,
  showNav = true,
}: Props) {
  const { ui } = useSettings();
  const [width, setWidth] = useState(0);
  const roomForScales = width === 0 || width >= SCALES_MIN_WIDTH;

  return (
    <View style={styles.root} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.left}>
        {showNav && (
          <>
            <IconButton onPress={onPrev} title="Précédent (←)">
              <Ionicons name="chevron-back" size={17} color={dt.inkSoft} />
            </IconButton>
            <IconButton onPress={onNext} title="Suivant (→)">
              <Ionicons name="chevron-forward" size={17} color={dt.inkSoft} />
            </IconButton>
            <Press onPress={onToday} style={styles.today} title="Aujourd'hui (T)">
              <Text style={styles.todayText}>Aujourd’hui</Text>
            </Press>
          </>
        )}

        <View style={[styles.titleBox, !showNav && styles.titleAlone]}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {showScales && roomForScales && (
        <View style={styles.scales}>
          {SCALES.map((s) => {
            const on = s.key === scale;
            return (
              <Press
                key={s.key}
                onPress={() => onScale(s.key)}
                title={`${s.label} (${s.kbd})`}
                style={[styles.scale, on && styles.scaleOn]}
              >
                <Text style={[styles.scaleText, on && { color: ui.accent, fontWeight: '700' }]}>
                  {s.label}
                </Text>
              </Press>
            );
          })}
        </View>
      )}

      {/*
        La recherche se réduit à son icône dès que la place manque. Le
        panneau de détail ouvert, la barre ne fait plus que 870 pixels :
        entre le titre de la période, les cinq échelles et les actions, le
        libellé « Rechercher » est ce qui se supprime avec le moins de
        perte — le raccourci reste dans l'infobulle, et ⌘K continue de
        marcher.
      */}
      <View style={styles.right}>
        <IconButton onPress={onSearch} title="Rechercher (⌘K)">
          <Ionicons name="search" size={15} color={dt.inkSoft} />
        </IconButton>
        <IconButton
          onPress={onToggleInspector}
          active={inspector}
          title="Panneau de détail (⌘.)"
        >
          <Ionicons name="reader-outline" size={16} color={dt.inkSoft} />
        </IconButton>
        <Press
          onPress={onCreate}
          style={[styles.create, { backgroundColor: ui.accent }]}
          title="Nouvel événement (N)"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createText}>Nouveau</Text>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: dt.topbar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dt.gap.md,
    paddingHorizontal: dt.gap.md,
    borderBottomWidth: 1,
    borderBottomColor: dt.line,
    backgroundColor: dt.panel,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, minWidth: 0 },
  // la zone de droite ne prend que ce qu'il lui faut : le reste va au titre,
  // qui sans ça se faisait tronquer dès que la période avait un nom un peu long

  today: { height: 28, paddingHorizontal: 11, borderRadius: dt.radius.sm, justifyContent: 'center' },
  todayText: { fontSize: 12.5, fontWeight: '700', color: dt.inkSoft },
  titleBox: { marginLeft: 8, flexShrink: 1, minWidth: TITLE_MIN },
  titleAlone: { marginLeft: 2 },
  title: { fontSize: 15.5, fontWeight: '800', color: dt.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: -1 },

  scales: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: dt.sunken,
    borderRadius: dt.radius.sm,
    padding: 2,
  },
  scale: { paddingHorizontal: 11, height: 25, borderRadius: dt.radius.xs, justifyContent: 'center' },
  scaleOn: { backgroundColor: dt.panel, ...dt.shadow.panel },
  scaleText: { fontSize: 12, fontWeight: '600', color: dt.inkSoft },

  right: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: dt.radius.sm,
  },
  createText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
});
