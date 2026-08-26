import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../../store/settings';
import type { DeskScale } from '../store/prefs';
import { alpha, dt, MOTION } from '../theme';
import { IconButton, Press } from './Press';

/**
 * En dessous de cette largeur, la barre n'a plus la place de tout porter.
 *
 * Le panneau de détail prend 344 pixels et la barre latérale 244 : sur un
 * portable de 1100 de large, il ne reste que 512 pour la barre du haut.
 * Le sélecteur d'échelles est ce qui se retire avec le moins de perte —
 * les touches 1 à 5 et la palette y donnent toujours accès, alors que le
 * titre, lui, est la seule chose qui dise où l'on se trouve.
 */
const SCALES_MIN_WIDTH = 680;
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
 *
 * La barre est translucide et floute ce qui passe dessous. Ce n'est pas
 * un effet : c'est ce qui dit que le contenu continue derrière elle
 * plutôt que de s'arrêter à son bord, et c'est le seul repère qui reste
 * quand une grille horaire défile sous une barre restée immobile.
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
            <View style={styles.arrows}>
              <IconButton onPress={onPrev} title="Précédent (←)" size={28}>
                <Ionicons name="chevron-back" size={16} color={dt.inkSoft} />
              </IconButton>
              <View style={styles.arrowSep} />
              <IconButton onPress={onNext} title="Suivant (→)" size={28}>
                <Ionicons name="chevron-forward" size={16} color={dt.inkSoft} />
              </IconButton>
            </View>
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
        <Segmented value={scale} onChange={onScale} accent={ui.accent} />
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
          <Ionicons
            name="reader-outline"
            size={16}
            color={inspector ? ui.accent : dt.inkSoft}
          />
        </IconButton>
        <Press
          onPress={onCreate}
          style={[
            styles.create,
            {
              backgroundColor: ui.accent,
              boxShadow: `0 1px 2px ${alpha(ui.accent, 0.3)}, 0 6px 16px -6px ${alpha(ui.accent, 0.55)}`,
            } as any,
          ]}
          hoverStyle={
            {
              boxShadow: `0 2px 4px ${alpha(ui.accent, 0.34)}, 0 10px 22px -6px ${alpha(ui.accent, 0.6)}`,
              transform: [{ translateY: -1 }],
            } as any
          }
          title="Nouvel événement (N)"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createText}>Nouveau</Text>
        </Press>
      </View>
    </View>
  );
}

/**
 * Le sélecteur d'échelle, avec sa pastille qui glisse.
 *
 * La pastille n'est pas un fond appliqué au bouton actif : c'est un seul
 * élément qu'on déplace d'un onglet à l'autre. La différence est visible
 * — le regard suit un objet qui se déplace au lieu de voir un carré
 * s'éteindre et un autre s'allumer — et elle est aussi ce qui fait sentir
 * que les cinq échelles forment un même axe, de l'année au jour.
 *
 * Les positions viennent de la mesure réelle de chaque onglet plutôt que
 * d'une largeur fixe : « Semaine » et « Jour » n'ont pas la même longueur,
 * et la pastille doit épouser celle qu'elle recouvre.
 */
function Segmented({
  value,
  onChange,
  accent,
}: {
  value: DeskScale;
  onChange: (s: DeskScale) => void;
  accent: string;
}) {
  const [boxes, setBoxes] = useState<Record<string, { x: number; w: number }>>({});
  const active = boxes[value];

  const measure = useCallback(
    (key: string) => (e: any) => {
      const { x, width } = e.nativeEvent.layout;
      setBoxes((prev) => {
        const was = prev[key];
        if (was && Math.abs(was.x - x) < 0.5 && Math.abs(was.w - width) < 0.5) return prev;
        return { ...prev, [key]: { x, w: width } };
      });
    },
    [],
  );

  return (
    <View style={styles.scales}>
      {/* la pastille, posée sous les libellés et déplacée par le compositeur */}
      {!!active && (
        <View
          pointerEvents="none"
          style={
            [
              styles.pill,
              {
                width: active.w,
                transform: [{ translateX: active.x }],
                transitionProperty: 'transform, width',
                transitionDuration: MOTION.base,
                transitionTimingFunction: MOTION.out,
              },
            ] as any
          }
        />
      )}
      {SCALES.map((s) => {
        const on = s.key === value;
        return (
          <Press
            key={s.key}
            onPress={() => onChange(s.key)}
            title={`${s.label} (${s.kbd})`}
            style={styles.scale}
            hoverStyle={on ? null : styles.scaleHover}
            onLayout={measure(s.key)}
          >
            <Text style={[styles.scaleText, on && { color: accent, fontWeight: '700' }]}>
              {s.label}
            </Text>
          </Press>
        );
      })}
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
    backgroundColor: dt.veil,
    backdropFilter: dt.veilBlur,
    WebkitBackdropFilter: dt.veilBlur,
    zIndex: 20,
  } as any,
  left: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },

  /* les deux flèches forment un seul bloc, comme sur une barre d'outils */
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dt.sunken,
    borderRadius: dt.radius.sm,
    padding: 1,
  },
  arrowSep: { width: 1, height: 15, backgroundColor: dt.line },

  today: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: dt.radius.sm,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dt.line,
    backgroundColor: dt.panel,
  },
  todayText: { fontSize: 12.5, fontWeight: '700', color: dt.inkSoft },

  titleBox: { marginLeft: 6, flexShrink: 1, minWidth: TITLE_MIN },
  titleAlone: { marginLeft: 2 },
  title: { fontSize: 16, fontWeight: '800', color: dt.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 10.5, fontWeight: '600', color: dt.inkFaint, marginTop: -1 },

  scales: {
    flexDirection: 'row',
    backgroundColor: dt.sunken,
    borderRadius: dt.radius.sm,
    padding: 2,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: dt.radius.xs,
    backgroundColor: dt.panel,
    ...dt.shadow.panel,
  },
  scale: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: dt.radius.xs,
    justifyContent: 'center',
  },
  scaleHover: { backgroundColor: 'rgba(32,32,43,0.035)' },
  scaleText: { fontSize: 12, fontWeight: '600', color: dt.inkSoft },

  right: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: dt.radius.sm,
  },
  createText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
});
