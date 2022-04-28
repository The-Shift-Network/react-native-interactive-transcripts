/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
  ScrollView,
  TextLayoutLine,
} from 'react-native';
import WebVttParser from './VTTtoJsonParser.js';
// this might crash if we ever ditch reanimated
import { interpolate } from 'react-native-reanimated';

export interface InteractiveTranscriptsProps {
  currentVideoProgress: number;
  url: string;
  textStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  inactiveTranscriptTextStyle?: StyleProp<TextStyle>;
  activeTranscriptTextStyle?: StyleProp<TextStyle>;
  activeTranscriptColor?: string;
  inactiveTranscriptColor?: string;
  alwaysAutoScroll: boolean;
  disableAutoScrollOnTouch: boolean;
}

const InteractiveTranscripts = ({
  currentVideoProgress = 0,
  url = '',
  textStyle = {},
  contentContainerStyle = {},
  activeTranscriptTextStyle,
  inactiveTranscriptTextStyle,
  alwaysAutoScroll,
  disableAutoScrollOnTouch,
}: InteractiveTranscriptsProps) => {
  const [cueArray, setCueArray] = useState<any[]>([]);
  const [selectedIndex, changeSelectedIndex] = useState(-1);
  const textLinesPositions = useRef<TextLayoutLine[] | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollEnabled = useRef<boolean>(true);
  const lastScrollPosition = useRef<number>(0);

  useEffect(() => {
    cueArray.length === 0 &&
      fetch(url)
        .then((response) => response.text())
        .then((text) => {
          let output = WebVttParser(text);
          setCueArray(output);
        });
    if (cueArray.length > 0) {
      let cueval = cueTextAndIndex(cueArray, currentVideoProgress);

      if (
        cueval.cueindex >= 0 &&
        // don't scrollTo again if it's the same line
        selectedIndex !== cueval.cueindex &&
        textLinesPositions.current &&
        textLinesPositions.current.length > 0
      ) {
        /** So a couple of things are fixed here. The onTextLayout below give us an array
         * of each of the Text lines rendered (like 200 entries in the array, for 200 lines).
         * Each entry in the cueArray above is a highlighted piece of text, let's say it's 70
         * in this case. So we need to find the corresponding index of the current highlighted
         * entry from the cueArray, that matches the line from onTextLayout, to get it's Y offset.
         * We use the Y offset to autoscroll to the current index.*/
        changeSelectedIndex(cueval.cueindex);

        const interpolatedLineIndex = Math.floor(
          interpolate(
            cueval.cueindex,
            [0, cueArray.length],
            [0, textLinesPositions.current.length]
          )
        );

        // use the index from above to get the Y offset from the onLayoutText lines array
        const lineYOffset = textLinesPositions.current[interpolatedLineIndex].y;
        /** the lineYOffset returns the Y offset at the top of the scrollview
         * Add (by subtracting) some extra padding to the top of the offset,
         * so the highlighted piece of text is not exactly at the top*/
        const lineYOffsetWithPadding = lineYOffset - 50;

        /** If this is enabled, when the user scrolls up/down once, the
         * autoscroll is disabled for this instance. */
        if (disableAutoScrollOnTouch && !autoScrollEnabled.current) {
          return;
        }

        /**
         * current index = current piece of text that's highlighted
         * If the user scrolls above the current index and
         * the index changes (progresses forward), force auto scroll
         * to the newest index.
         *
         * If the user scrolls past the current index, do not autoscroll
         * back to the current index. (spotify like interaction)
         * */
        if (
          lastScrollPosition.current < lineYOffsetWithPadding ||
          alwaysAutoScroll
        ) {
          /** Scroll to the current line in the transcript. */
          scrollViewRef.current?.scrollTo?.({
            y: lineYOffsetWithPadding,
            animated: true,
          });
        }
      }
    }
  }, [
    url,
    currentVideoProgress,
    cueArray,
    selectedIndex,
    disableAutoScrollOnTouch,
  ]);

  /**
   * To find the CC current text to display
   */
  const cueTextAndIndex = useCallback(
    (array: any, value: number) => {
      let low = 0,
        high = array.length - 1;
      while (low < high) {
        var mid = (low + high) >>> 1;
        if (array[mid].startTime <= value) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      low = low - 1;
      if (low < 0) {
        return { cuetext: '', cueindex: -1 };
      }
      return {
        cuetext:
          array[low].endTime >= value ? array[low].text : array[high].text,
        cueindex:
          array[low].endTime >= value
            ? array[low].sequence
            : array[high].sequence,
      };
    },
    [url]
  );

  const lastNewLineTextIndex = useRef<number>(-1);

  const formatText = (text: string, index: number) => {
    const hasNewLine = text.match(/\\n/g);
    if (hasNewLine) {
      // add two new lines when the text has a new line (also replaces normal \n with jsx \n)
      const textWithNewLine = text.replace(/\\n/g, '\n\n');
      lastNewLineTextIndex.current = index;
      return textWithNewLine;
    }

    if (index === 0) {
      return `${text} `;
    }

    return ` ${text}`;
  };

  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      ref={scrollViewRef}
      showsVerticalScrollIndicator={false}
      onScroll={(scrollEvent) => {
        lastScrollPosition.current = scrollEvent.nativeEvent.contentOffset.y;
      }}
      onTouchStart={() => (autoScrollEnabled.current = false)}
    >
      {cueArray !== null && (
        <Text
          style={inactiveTranscriptTextStyle}
          onTextLayout={(event) =>
            // If the user scrolled the transcript, disable the autoscroll
            (textLinesPositions.current = event.nativeEvent.lines)
          }
        >
          {cueArray.map((item, index) => {
            return selectedIndex === index ? (
              <Text
                key={`${item.text}`}
                style={[textStyle, activeTranscriptTextStyle]}
              >
                {formatText(item.text, index)}
              </Text>
            ) : (
              <Text
                key={`${item.text}`}
                style={[textStyle, inactiveTranscriptTextStyle]}
              >
                {formatText(item.text, index)}
              </Text>
            );
          })}
        </Text>
      )}
    </ScrollView>
  );
};

export default InteractiveTranscripts;
