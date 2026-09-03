import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  addDays,
  addMonths,
  dayMonth,
  fromKey,
  getISOWeek,
  longDay,
  minutesNow,
  monthYearTitle,
  startOfMonth,
  startOfWeek,
  toKey,
  todayKey,
  weekOf,
} from '../lib/date';
import { suggestFromTitle } from '../lib/suggest';
import { splitOccurrenceId } from '../lib/repeat';
import { useNotifyPrefs } from '../notify/push';
import { useEvents, type Scope } from '../store/events';
import { useSettings } from '../store/settings';
import { useTodos } from '../store/todos';
import { COLOR_KEYS } from '../theme';
import type { AgendaEvent, Draft, Todo } from '../types';
import { useKeyboard, type Binding } from './lib/keys';
import { useWheelNav, useWheelZoom } from './lib/trackpad';
import { installDesktopStyle, setAccentVar } from './lib/webstyle';
import { Inspector, type InspectorPane } from './parts/Inspector';
import { Appear } from './parts/Motion';
import { Palette, type Command } from './parts/Palette';
import { SettingsPanel } from './parts/SettingsPanel';
import { Sidebar } from './parts/Sidebar';
import { TimeGrid } from './parts/TimeGrid';
import { Topbar } from './parts/Topbar';
import { HOUR_MAX, HOUR_MIN, useDeskPrefs, type DeskScale } from './store/prefs';
import { dt } from './theme';
import { DashboardView } from './views/DashboardView';
import { IdeasView } from './views/IdeasView';
import { ListView } from './views/ListView';
import { MonthView } from './views/MonthView';
import { YearView } from './views/YearView';

/** Les échelles qu'un pincement traverse, du plus large au plus serré. */
const ZOOM_PATH: DeskScale[] = ['year', 'month', 'week', 'day'];

/**
 * L'application, version ordinateur.
 *
 * Une seule disposition, tenue de bout en bout : barre latérale à gauche,
 * vue au centre, fiche à droite. Rien ne se superpose au contenu sauf la
 * palette et les réglages — pas de feuille qui monte, pas d'écran qui
 * remplace un autre. C'est le contraire du mobile, où chaque tâche prend
 * tout l'écran à son tour parce qu'il n'y a pas de place pour deux.
 *
 * L'interface mobile n'est pas touchée : elle vit dans `src/screens`,
 * ce fichier ne l'importe pas, et le choix entre les deux se fait une
 * fois pour toutes dans `App.tsx`.
 */
export function DesktopRoot() {
  /*
    La feuille de style du bureau, posée au premier dessin de la première
    fenêtre — et seulement là. Ce module est chargé par le paquet quelle
    que soit l'interface montée : l'appeler au chargement poserait ses
    règles jusque dans la page d'un téléphone, où elles seraient inertes
    faute de racine à laquelle s'accrocher, mais où elles n'ont rien à
    faire. Elle est en place avant que le navigateur ne peigne quoi que
    ce soit, et l'appel est sans effet les fois suivantes.
  */
  installDesktopStyle();

  const { byDay, events, eventsOn, save, remove, toggleDone } = useEvents();
  const { pending, remove: removeTodo } = useTodos();
  const { settings, ui } = useSettings();
  const { prefs, update } = useDeskPrefs();

  /* La couleur d'accent voyage jusqu'aux règles CSS par une variable :
     anneaux de focus, curseur de saisie et texte sélectionné vivent dans
     des pseudo-éléments qu'aucun objet de style ne peut atteindre. */
  useEffect(() => setAccentVar(ui.accent), [ui.accent]);

  const [selectedKey, setSelectedKey] = useState(todayKey());
  const [draft, setDraft] = useState<Draft | null>(null);
  /** sur une occurrence de routine : la règle entière, ou seulement ce jour-là */
  const [scope, setScope] = useState<Scope>('all');
  const { prefs: notify } = useNotifyPrefs();
  /**
   * Ce que le panneau de droite montre : le jour choisi, ou la fiche.
   *
   * Sans cet état, une fiche ouverte confisquait le panneau : choisir un
   * autre jour dans la semaine changeait bien le jour partout ailleurs,
   * mais la colonne de droite restait sur la fiche, et on ne voyait
   * jamais ce que le jour qu'on venait de désigner contenait. Fermer la
   * fiche pour aller voir aurait perdu la saisie en cours ; le panneau
   * porte donc les deux, et bascule vers ce qu'on vient de demander —
   * la fiche quand on l'ouvre, le jour quand on en désigne un.
   */
  const [pane, setPane] = useState<InspectorPane>('day');
  /** l'idée dont vient la fiche ouverte : elle sortira de la boîte une fois placée */
  const [fromTodo, setFromTodo] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hostRef = useRef<any>(null);
  const nudgeRef = useRef<any>(null);

  const day = useMemo(() => fromKey(selectedKey), [selectedKey]);
  const scale = prefs.scale;

  /** Désigner un jour — d'un clic, d'une flèche — c'est demander à le voir. */
  const pickDay = useCallback((key: string) => {
    setSelectedKey(key);
    setPane('day');
  }, []);

  const visibleOn = useCallback(
    (key: string) => {
      const list = byDay[key] ?? [];
      return prefs.showDone ? list : list.filter((e) => !e.done);
    },
    [byDay, prefs.showDone],
  );
  const countOn = useCallback((key: string) => visibleOn(key).length, [visibleOn]);

  /* ---- navigation ---- */

  const step = useCallback(
    (dir: 1 | -1) => {
      setPane('day');
      setSelectedKey((key) => {
        const d = fromKey(key);
        if (scale === 'year') return toKey(addMonths(d, 12 * dir));
        if (scale === 'month') return toKey(addMonths(d, dir));
        if (scale === 'day') return toKey(addDays(d, dir));
        return toKey(addDays(d, 7 * dir)); // semaine et liste
      });
    },
    [scale],
  );

  const goToday = useCallback(() => pickDay(todayKey()), [pickDay]);

  /* Le pincement traverse les échelles ; « liste » n'est pas sur ce chemin. */
  const zoom = useCallback(
    (dir: 1 | -1) => {
      const i = ZOOM_PATH.indexOf(scale);
      if (i === -1) {
        update({ scale: dir > 0 ? 'day' : 'month' });
        return;
      }
      const next = ZOOM_PATH[Math.max(0, Math.min(ZOOM_PATH.length - 1, i + dir))];
      if (next !== scale) update({ scale: next });
    },
    [scale, update],
  );

  useWheelNav(hostRef, {
    onPrev: () => step(-1),
    onNext: () => step(1),
    nudgeRef,
    enabled: prefs.section === 'calendar' && !paletteOpen && !settingsOpen,
  });

  useWheelZoom(hostRef, {
    onZoomIn: () => zoom(1),
    onZoomOut: () => zoom(-1),
    enabled: prefs.section === 'calendar' && !paletteOpen && !settingsOpen,
  });

  /* ---- fiches ---- */

  const makeDraft = useCallback(
    (dateKey: string, start?: number, end?: number, seed?: Partial<Draft>): Draft => {
      const isToday = dateKey === todayKey();
      const base =
        start ?? (isToday ? Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30) : 9 * 60);
      return {
        title: '',
        emoji: '✨',
        color: COLOR_KEYS[events.length % COLOR_KEYS.length],
        allDay: false,
        location: '',
        notes: '',
        done: false,
        repeat: null,
        // les rappels réglés dans les préférences valent aussi ici
        alerts: notify.defaultAlerts,
        ...seed,
        date: dateKey,
        start: base,
        end: end ?? Math.min(1440, base + 60),
      };
    },
    [events.length, notify.defaultAlerts],
  );

  const openEvent = useCallback((e: AgendaEvent) => {
    setFromTodo(null);
    setScope('all');
    setDraft(e);
    setSelectedKey(e.date);
    setPane('card');
    update({ inspector: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAt = useCallback(
    (dateKey: string, start?: number, end?: number) => {
      setFromTodo(null);
      setSelectedKey(dateKey);
      setDraft(makeDraft(dateKey, start, end));
      setPane('card');
      update({ inspector: true });
    },
    [makeDraft, update],
  );

  /** Une idée sort de la boîte et va chercher un créneau. */
  const scheduleTodo = useCallback(
    (todo: Todo) => {
      const guess = settings.autoColor ? suggestFromTitle(todo.title) : null;
      const target = selectedKey;
      setFromTodo(todo.id);
      setDraft(
        makeDraft(target, undefined, undefined, {
          title: todo.title,
          notes: todo.notes,
          ...(guess ?? {}),
        }),
      );
      setPane('card');
      // placer une idée revient à travailler dans le calendrier
      update({ section: 'calendar', inspector: true });
    },
    [makeDraft, selectedKey, settings.autoColor, update],
  );

  const patchDraft = useCallback(
    (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d)),
    [],
  );

  const commit = useCallback(() => {
    if (!draft) return;
    const wasOccurrence = draft.id ? splitOccurrenceId(draft.id) : null;
    const saved = save(draft, scope);
    if (fromTodo) {
      removeTodo(fromTodo);
      setFromTodo(null);
    }
    /*
      Une routine modifiée en entier renvoie sa fiche mère, qui porte la
      date d'ancrage de la série — pas celle du jour qu'on regardait. La
      reprendre telle quelle ferait sauter le panneau des mois en arrière ;
      on garde donc à l'écran l'occurrence sur laquelle on travaillait.
    */
    if (wasOccurrence && scope === 'all') {
      setDraft({ ...saved, id: draft.id, date: draft.date });
      setSelectedKey(draft.date);
      return;
    }
    setSelectedKey(saved.date);
    setDraft(saved);
  }, [draft, save, scope, fromTodo, removeTodo]);

  const closeCard = useCallback(() => {
    setDraft(null);
    setPane('day');
  }, []);

  const drop = useCallback(() => {
    if (draft?.id) remove(draft.id, scope);
    closeCard();
  }, [draft, remove, scope, closeCard]);

  /* ---- titre ---- */

  const { title, subtitle } = useMemo(() => {
    if (prefs.section === 'dashboard') return { title: 'Le point du jour', subtitle: undefined };
    if (prefs.section === 'ideas')
      return { title: 'Idées', subtitle: `${pending.length} en attente` };
    switch (scale) {
      case 'year':
        return { title: `${day.getFullYear()}`, subtitle: undefined };
      case 'day':
        return { title: longDay(day), subtitle: `Semaine ${getISOWeek(day)}` };
      case 'week': {
        const w = weekOf(day, settings.weekStart);
        return {
          title: `${dayMonth(w[0])} – ${dayMonth(w[6])}`,
          subtitle: `Semaine ${getISOWeek(day)}`,
        };
      }
      case 'list':
        return { title: 'À venir', subtitle: monthYearTitle(day) };
      default:
        return { title: monthYearTitle(day), subtitle: undefined };
    }
  }, [prefs.section, scale, day, settings.weekStart, pending.length]);

  /* ---- raccourcis ---- */

  const commands = useMemo<Command[]>(
    () => [
      { id: 'today', label: 'Aujourd’hui', hint: 'T', icon: 'today-outline', run: goToday },
      { id: 'new', label: 'Nouvel événement', hint: 'N', icon: 'add-circle-outline', run: () => createAt(selectedKey) },
      { id: 'dash', label: 'Voir le point du jour', hint: 'G', icon: 'sunny-outline', run: () => update({ section: 'dashboard' }) },
      { id: 'cal', label: 'Voir le calendrier', hint: 'C', icon: 'calendar-outline', run: () => update({ section: 'calendar' }) },
      { id: 'ideas', label: 'Voir les idées', hint: 'I', icon: 'sparkles-outline', run: () => update({ section: 'ideas' }) },
      { id: 'year', label: 'Échelle : année', hint: '1', icon: 'grid-outline', run: () => update({ section: 'calendar', scale: 'year' }) },
      { id: 'month', label: 'Échelle : mois', hint: '2', icon: 'calendar-outline', run: () => update({ section: 'calendar', scale: 'month' }) },
      { id: 'week', label: 'Échelle : semaine', hint: '3', icon: 'apps-outline', run: () => update({ section: 'calendar', scale: 'week' }) },
      { id: 'day', label: 'Échelle : jour', hint: '4', icon: 'time-outline', run: () => update({ section: 'calendar', scale: 'day' }) },
      { id: 'list', label: 'Échelle : liste', hint: '5', icon: 'list-outline', run: () => update({ section: 'calendar', scale: 'list' }) },
      { id: 'settings', label: 'Réglages', hint: ',', icon: 'options-outline', run: () => setSettingsOpen(true) },
    ],
    [goToday, createAt, selectedKey, update],
  );

  const bindings = useMemo<Binding[]>(() => {
    const setScale = (s: DeskScale) => () => update({ section: 'calendar', scale: s });
    return [
      { key: 'Escape', whileTyping: true, run: () => {
        if (paletteOpen) setPaletteOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else closeCard();
      } },
      { key: 'Enter', meta: true, whileTyping: true, run: commit },
      { key: 'k', meta: true, whileTyping: true, run: () => setPaletteOpen(true) },
      { key: '.', meta: true, run: () => update({ inspector: !prefs.inspector }) },
      { key: 'ArrowLeft', run: () => step(-1) },
      { key: 'ArrowRight', run: () => step(1) },
      { key: 't', run: goToday },
      { key: 'n', run: () => createAt(selectedKey) },
      { key: 'g', run: () => update({ section: 'dashboard' }) },
      { key: 'c', run: () => update({ section: 'calendar' }) },
      { key: 'i', run: () => update({ section: 'ideas' }) },
      { key: '1', run: setScale('year') },
      { key: '2', run: setScale('month') },
      { key: '3', run: setScale('week') },
      { key: '4', run: setScale('day') },
      { key: '5', run: setScale('list') },
      { key: ',', run: () => setSettingsOpen(true) },
      { key: 'Backspace', run: () => draft?.id && drop() },
      { key: '=', meta: true, run: () => update({ hourHeight: Math.min(HOUR_MAX, prefs.hourHeight + 8) }) },
      { key: '-', meta: true, run: () => update({ hourHeight: Math.max(HOUR_MIN, prefs.hourHeight - 8) }) },
    ];
  }, [paletteOpen, settingsOpen, commit, closeCard, update, prefs.inspector, prefs.hourHeight, step, goToday, createAt, selectedKey, draft, drop]);

  useKeyboard(bindings);

  /* ---- la vue centrale ---- */

  const weekDays = useMemo(() => {
    const all = weekOf(day, settings.weekStart).map(toKey);
    if (prefs.showWeekends) return all;
    return all.filter((k) => {
      const wd = fromKey(k).getDay();
      return wd !== 0 && wd !== 6;
    });
  }, [day, settings.weekStart, prefs.showWeekends]);

  const nextUp = useMemo(() => {
    const now = minutesNow();
    const e = (byDay[todayKey()] ?? []).find((x) => !x.allDay && x.end > now && !x.done);
    return e ? { title: e.title, emoji: e.emoji, start: e.start, color: e.color } : null;
  }, [byDay]);

  const body = () => {
    if (prefs.section === 'dashboard')
      return (
        <DashboardView
          eventsOn={visibleOn}
          onSelectEvent={openEvent}
          onSelectDay={(k) => {
            pickDay(k);
            update({ section: 'calendar', scale: 'day' });
          }}
          onCreate={(k) => createAt(k)}
          onSchedule={scheduleTodo}
          onToggleEvent={toggleDone}
        />
      );

    if (prefs.section === 'ideas')
      return <IdeasView onSchedule={scheduleTodo} />;

    switch (scale) {
      case 'year':
        return (
          <YearView
            year={day.getFullYear()}
            countOn={countOn}
            selectedKey={selectedKey}
            onSelectDay={(k) => {
              pickDay(k);
              update({ scale: 'day' });
            }}
            onOpenMonth={(m) => {
              pickDay(toKey(startOfMonth(m)));
              update({ scale: 'month' });
            }}
          />
        );
      case 'month':
        return (
          <MonthView
            month={day}
            eventsOn={visibleOn}
            selectedKey={selectedKey}
            selectedId={draft?.id ?? null}
            onSelectDay={pickDay}
            onSelectEvent={openEvent}
            onCreate={(k) => createAt(k)}
          />
        );
      case 'list':
        return (
          <ListView
            anchorKey={selectedKey}
            eventsOn={visibleOn}
            selectedId={draft?.id ?? null}
            onSelectEvent={openEvent}
            onSelectDay={pickDay}
            onCreate={(k) => createAt(k)}
          />
        );
      case 'day':
        return (
          <TimeGrid
            days={[selectedKey]}
            eventsOn={visibleOn}
            startHour={0}
            endHour={24}
            hourHeight={prefs.hourHeight}
            selectedId={draft?.id ?? null}
            onSelectEvent={openEvent}
            onCreate={createAt}
            onPickDay={pickDay}
            onDrawDay={setSelectedKey}
          />
        );
      default:
        return (
          <TimeGrid
            days={weekDays}
            eventsOn={visibleOn}
            startHour={0}
            endHour={24}
            hourHeight={prefs.hourHeight}
            selectedId={draft?.id ?? null}
            onSelectEvent={openEvent}
            onCreate={createAt}
            onPickDay={pickDay}
            onDrawDay={setSelectedKey}
          />
        );
    }
  };

  return (
    <View dataSet={{ dkRoot: '1' }} style={styles.root}>
      {/*
        Le cadre : c'est lui qui porte la marge et les écarts, pas la
        racine. Les couches modales sont posées à côté de lui plutôt que
        dedans, sinon leur voile s'arrêterait au bord de la marge et
        laisserait un liseré net tout autour de la fenêtre.
      */}
      <View style={styles.frame}>
        {prefs.sidebar && (
          <Sidebar
            section={prefs.section}
            onSection={(section) => update({ section })}
            month={startOfMonth(day)}
            selectedKey={selectedKey}
            countOn={countOn}
            onSelectDay={(k) => {
              pickDay(k);
              if (prefs.section !== 'calendar') update({ section: 'calendar' });
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onSchedule={scheduleTodo}
            onOpenTodo={() => update({ section: 'ideas' })}
            nextUp={nextUp}
          />
        )}

        <View style={styles.center}>
          <Topbar
            title={title}
            subtitle={subtitle}
            scale={scale}
            onScale={(s) => update({ section: 'calendar', scale: s })}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onToday={goToday}
            onSearch={() => setPaletteOpen(true)}
            onCreate={() => createAt(selectedKey)}
            inspector={prefs.inspector}
            onToggleInspector={() => update({ inspector: !prefs.inspector })}
            showScales={prefs.section === 'calendar'}
            showNav={prefs.section === 'calendar'}
          />

          {/*
            C'est ce cadre qui écoute le trackpad. Le décalage du geste est
            appliqué au nœud intérieur, pour que la barre du haut reste
            immobile pendant qu'on balaie.
          */}
          <View ref={hostRef} style={styles.stage}>
            <View ref={nudgeRef} style={styles.fill}>
              {/*
                La `key` est ce qui rejoue l'apparition : elle ne change que
                lorsqu'on passe d'une vue ou d'une échelle à une autre, jamais
                en avançant d'une semaine — feuilleter le calendrier doit
                rester instantané, seul un changement de nature s'annonce.
              */}
              <Appear key={`${prefs.section}:${scale}`} style={styles.fill}>
                {body()}
              </Appear>
            </View>
          </View>
        </View>

        {prefs.inspector && (
          <View style={styles.inspector}>
            <Inspector
              draft={draft}
              pane={pane}
              onPane={setPane}
              dayKey={selectedKey}
              dayEvents={visibleOn(selectedKey)}
              scope={scope}
              onScope={setScope}
              onChange={patchDraft}
              onSave={commit}
              onDelete={drop}
              onClose={closeCard}
              onSelectEvent={openEvent}
              onCreate={() => createAt(selectedKey)}
            />
          </View>
        )}
      </View>

      <Palette
        visible={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        events={events}
        onOpenEvent={openEvent}
      />
      <SettingsPanel visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dt.canvas,
    backgroundImage: dt.canvasWash,
  } as any,
  frame: { flex: 1, flexDirection: 'row', padding: dt.frame, gap: dt.frame },
  center: { flex: 1, minWidth: 0, gap: dt.frame },
  /* la feuille de travail : plus claire que la toile, donc posée dessus */
  stage: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: dt.panelRadius,
    backgroundColor: dt.bg,
    ...dt.shadow.float,
  },
  fill: { flex: 1 },
  inspector: { width: dt.inspector },
});
