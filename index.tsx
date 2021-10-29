/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleProp, Text, TextStyle, ViewStyle, View } from 'react-native';
import WebVttParser from './src/VTTtoJsonParser.js';

export interface InteractiveTranscriptsProps {
  currentVideoProgress: number;
  url: string;
  textStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  inactiveTranscriptTextStyle?: StyleProp<TextStyle>;
  activeTranscriptTextStyle?: StyleProp<TextStyle>;
  activeTranscriptColor?: string;
  inactiveTranscriptColor?: string;
  onFocusNextLine: (index: number) => void;
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

      if (cueval.cueindex >= 0 && selectedIndex !== cueval.cueindex) {
        changeSelectedIndex(cueval.cueindex);

        /** This sends the current transcript line index to the parent (so we can scrollTo) */
        onFocusNextLine(cueval.cueindex);
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

  return (
    <View style={contentContainerStyle}>
      {cueArray !== null && (
        <Text style={inactiveTranscriptTextStyle}>
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
