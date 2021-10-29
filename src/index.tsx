/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
  View,
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
  onFocusNextLine: (lineYOffset: number) => void;
}

const InteractiveTranscripts = ({
  currentVideoProgress = 0,
  url = '',
  textStyle = {},
  contentContainerStyle = {},
  activeTranscriptTextStyle,
  inactiveTranscriptTextStyle,
  onFocusNextLine,
}: InteractiveTranscriptsProps) => {
  const [cueArray, setCueArray] = useState<any[]>([]);
  const [selectedIndex, changeSelectedIndex] = useState(-1);
  const textLinesPositions = useRef<TextLayoutLine[] | null>(null);

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

      console.tron.log('cuearray', cueArray);
      if (
        cueval.cueindex >= 0 &&
        // don't scrollTo again if it's the same line
        selectedIndex !== cueval.cueindex &&
        textLinesPositions.current &&
        textLinesPositions.current.length > 0
      ) {
        /** So a couple of things are fixed here. The onTextLayout below give us an array
         * of each of the Text lines rendered (like 200 entries in the array, for 200 lines.
         * Each entry in the cueArray above is a highlighted piece of text, let's say it's 70
         * in this case. So we need to find the corresponding index of the current highlighted
         * entry from the cueArray, that matches the line from onTextLayout, to get it's Y offset.*/
        changeSelectedIndex(cueval.cueindex);

        // get the corresponding index in the onLayoutText lines array of the current highlighted text
        const interpolatedLineIndex = Math.floor(
          interpolate(
            cueval.cueindex,
            [0, cueArray.length],
            [0, textLinesPositions.current.length]
          )
        );

        // use the index from above to get the Y offset from the onLayoutText lines array
        const lineYOffset = textLinesPositions.current[interpolatedLineIndex].y;

        /** This sends the current transcript line index to the parent (so we can scrollTo) */
        onFocusNextLine(lineYOffset);
      }
    }
  }, [url, currentVideoProgress, cueArray, selectedIndex, onFocusNextLine]);

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
        cuetext: array[low].endTime >= value ? array[low].text : '',
        cueindex: array[low].endTime >= value ? array[low].sequence : -1,
      };
    },
    [url]
  );

  const lastNewLineTextIndex = useRef<number>(-1);

  const formatText = (text: string, index: number) => {
    const hasNewLine = text.match(/\\n/g);
    if (hasNewLine) {
      // add two new lines when the text has a new line (also replaces normal \n with jsx \n)
      const textWithNewLine = text.replaceAll(/\\n/g, '\n\n');
      lastNewLineTextIndex.current = index;
      return textWithNewLine;
    }

    // if we had a new line previously, do not add a white space at the begginning of the text, which is a new row
    if (lastNewLineTextIndex.current + 1 === index) {
      return `${text.trim()} `;
    }

    if (index === 0) {
      return `${text} `;
    }

    return ` ${text} `;
  };
  console.tron.log('this render works');

  return (
    <View style={contentContainerStyle}>
      {cueArray !== null && (
        <Text
          style={inactiveTranscriptTextStyle}
          onTextLayout={(event) =>
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
    </View>
  );
};

export default InteractiveTranscripts;
