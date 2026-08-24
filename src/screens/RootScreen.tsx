import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddButton } from '../components/AddButton';
import { EventSheet } from '../components/EventSheet';
import { SettingsSheet } from '../components/SettingsSheet';
import { TabBar, TAB_BAR_HEIGHT, type TabKey } from '../components/TabBar';
import { TodoSheet } from '../components/TodoSheet';
import { minutesNow, todayKey } from '../lib/date';
import { suggestFromTitle } from '../lib/suggest';
import { useEvents } from '../store/events';
import { useSettings } from '../store/settings';
import { useTodos } from '../store/todos';
import { COLOR_KEYS } from '../theme';
import type { AgendaEvent, Draft, Todo, TodoDraft } from '../types';
import { CalendarScreen } from './CalendarScreen';
import { HomeScreen } from './HomeScreen';
import { TodoScreen } from './TodoScreen';

/** Assemble les trois écrans et détient les feuilles partagées. */
export function RootScreen() {
  const insets = useSafeAreaInsets();
  const { byDay, events, save, remove, toggleDone } = useEvents();
  const { pending, save: saveTodo, remove: removeTodo, toggleDone: toggleTodo } = useTodos();
  const { settings, update } = useSettings();

  const [tab, setTab] = useState<TabKey>('home');
  const [selectedKey, setSelectedKey] = useState(todayKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventSheet, setEventSheet] = useState<{
    visible: boolean;
    draft: Draft | null;
    /** l'idée dont vient cet événement : elle sortira de la boîte une fois placée */
    fromTodo?: string;
  }>({ visible: false, draft: null });
  const [todoSheet, setTodoSheet] = useState<{ visible: boolean; draft: TodoDraft | null }>({
    visible: false,
    draft: null,
  });

  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  const makeDraft = useCallback(
    (dateKey: string, start?: number, seed?: Partial<Draft>): Draft => {
      const isToday = dateKey === todayKey();
      const base =
        start ?? (isToday ? Math.min(23 * 60, Math.ceil(minutesNow() / 30) * 30) : 9 * 60);
      const length =
        seed?.start != null && seed?.end != null ? Math.max(15, seed.end - seed.start) : 60;
      const { date: _d, start: _s, end: _e, ...rest } = seed ?? {};
      return {
        title: '',
        emoji: '✨',
        color: COLOR_KEYS[events.length % COLOR_KEYS.length],
        allDay: false,
        location: '',
        notes: '',
        done: false,
        ...rest,
        date: dateKey,
        start: base,
        end: Math.min(1440, base + length),
      };
    },
    [events.length],
  );

  const openEvent = useCallback(
    (e: AgendaEvent) => setEventSheet({ visible: true, draft: e }),
    [],
  );

  const createAt = useCallback(
    (dateKey: string, minutes?: number) => {
      if (dateKey !== selectedKey) setSelectedKey(dateKey);
      setEventSheet({ visible: true, draft: makeDraft(dateKey, minutes) });
    },
    [makeDraft, selectedKey],
  );

  /**
   * Une idée sort de la boîte et va chercher un créneau.
   * C'est là qu'elle prend une identité : couleur et emoji devinés du titre,
   * modifiables ensuite dans la fiche.
   */
  const scheduleTodo = useCallback(
    (todo: Todo | TodoDraft) => {
      const target = selectedKey === todayKey() ? todayKey() : selectedKey;
      const guess = settings.autoColor ? suggestFromTitle(todo.title) : null;
      setEventSheet({
        visible: true,
        fromTodo: todo.id,
        draft: makeDraft(target, undefined, {
          title: todo.title,
          notes: todo.notes,
          ...(guess ? { emoji: guess.emoji, color: guess.color } : {}),
          start: 0,
          end: todo.estimate,
        }),
      });
    },
    [makeDraft, selectedKey, settings.autoColor],
  );

  const handleSaveEvent = useCallback(
    (draft: Draft) => {
      save(draft);
      if (draft.date !== selectedKey) setSelectedKey(draft.date);
      if (eventSheet.fromTodo) removeTodo(eventSheet.fromTodo);
    },
    [save, selectedKey, eventSheet.fromTodo, removeTodo],
  );

  const openTodo = useCallback((t: Todo) => setTodoSheet({ visible: true, draft: t }), []);

  const createTodo = useCallback(
    () =>
      setTodoSheet({
        visible: true,
        draft: { title: '', notes: '', done: false, estimate: 60 },
      }),
    [],
  );

  const goAgenda = useCallback(
    (scale?: typeof settings.scale) => {
      if (scale && scale !== settings.scale) update({ scale });
      setTab('agenda');
    },
    [settings.scale, update],
  );

  const screen = useMemo(() => {
    switch (tab) {
      case 'agenda':
        return (
          <CalendarScreen
            selectedKey={selectedKey}
            onSelectDay={setSelectedKey}
            onOpenEvent={openEvent}
            onRemoveEvent={remove}
            onCreateAt={createAt}
            onOpenSettings={() => setSettingsOpen(true)}
            bottomInset={bottomInset}
          />
        );
      case 'todo':
        return (
          <TodoScreen
            onOpen={openTodo}
            onSchedule={scheduleTodo}
            bottomInset={bottomInset}
          />
        );
      default:
        return (
          <HomeScreen
            onOpenAgenda={() => {
              setSelectedKey(todayKey());
              goAgenda('day');
            }}
            onOpenTodos={() => setTab('todo')}
            onCreateToday={() => createAt(todayKey())}
            onOpenEvent={openEvent}
            onToggleEvent={toggleDone}
            onRemoveEvent={remove}
            onOpenTodo={openTodo}
            onToggleTodo={toggleTodo}
            onRemoveTodo={removeTodo}
            onScheduleTodo={scheduleTodo}
            onOpenSettings={() => setSettingsOpen(true)}
            bottomInset={bottomInset}
          />
        );
    }
  }, [
    tab,
    selectedKey,
    openEvent,
    createAt,
    bottomInset,
    remove,
    openTodo,
    scheduleTodo,
    toggleDone,
    toggleTodo,
    removeTodo,
    goAgenda,
  ]);

  return (
    <View style={styles.root}>
      <View key={tab} style={styles.root}>
        {screen}
      </View>

      <AddButton
        onPress={() =>
          tab === 'todo' ? createTodo() : createAt(tab === 'home' ? todayKey() : selectedKey)
        }
        onLongPress={createTodo}
        bottom={bottomInset + 14}
      />

      <TabBar tab={tab} onChange={setTab} badge={pending.length} bottom={insets.bottom || 10} />

      <EventSheet
        visible={eventSheet.visible}
        draft={eventSheet.draft}
        byDay={byDay}
        onClose={() => setEventSheet((s) => ({ ...s, visible: false, fromTodo: undefined }))}
        onSave={handleSaveEvent}
        onDelete={remove}
      />

      <TodoSheet
        visible={todoSheet.visible}
        draft={todoSheet.draft}
        onClose={() => setTodoSheet((s) => ({ ...s, visible: false }))}
        onSave={saveTodo}
        onDelete={removeTodo}
        onSchedule={(t) => {
          const saved = saveTodo(t);
          scheduleTodo(saved);
        }}
      />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
