import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

import { Spacing } from '@/constants/theme';

// Gap kept between the focused input and the top of the keyboard.
const INPUT_MARGIN = Spacing.four;

/**
 * ScrollView that keeps the focused TextInput visible above the keyboard.
 *
 * react-native-keyboard-aware-scroll-view assumes Android resizes the window
 * and scrolls the input into view itself, then only nudges it by a small extra
 * height. With edge-to-edge (forced on RN 0.86) the window never resizes, so an
 * input near the bottom of a long screen stays hidden. This pads the content by
 * the keyboard height and scrolls by exactly the overlap instead.
 */
export function KeyboardScrollView({
  contentContainerStyle,
  onScroll,
  children,
  ...props
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Runs after the keyboard padding is committed, so there is room to scroll into.
  useEffect(() => {
    if (keyboardHeight === 0) return;
    const input = TextInput.State.currentlyFocusedInput();
    if (!input) return;
    input.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + INPUT_MARGIN - keyboardTop.current;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
      }
    });
  }, [keyboardHeight]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  }

  const basePadding = StyleSheet.flatten(contentContainerStyle)?.paddingBottom;

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      onScroll={handleScroll}
      contentContainerStyle={[
        contentContainerStyle,
        keyboardHeight > 0 && {
          paddingBottom: (typeof basePadding === 'number' ? basePadding : 0) + keyboardHeight,
        },
      ]}>
      {children}
    </ScrollView>
  );
}
