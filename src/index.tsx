/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
  View,
} from 'react-native';
import WebVttParser from './VTTtoJsonParser.js';

export interface InteractiveTranscriptsProps {
  currentVideoProgress: number;
  url: string;
  seekToTranscriptDuration: (p: number) => void;
  textStyle?: StyleProp<ViewStyle>;
  textContainerStyle?: StyleProp<ViewStyle>;
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
  seekToTranscriptDuration = () => {},
  textStyle = {},
  textContainerStyle = { margin: 5 },
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
  const cueTextAndIndex = (array: any, value: number) => {
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
  };

  return (
    <>
      {cueArray !== null && (
        <View style={contentContainerStyle}>
          {cueArray.map((item, index) => {
            return (
              <TouchableOpacity
                style={[textContainerStyle]}
                onPress={() => {
                  seekToTranscriptDuration(item.startTime / 1000);
                }}
                key={`${item.startTime}`}
              >
                {selectedIndex === index ? (
                  <Text style={[textStyle, activeTranscriptTextStyle]}>
                    {item.text}
                  </Text>
                ) : (
                  <Text style={[textStyle, inactiveTranscriptTextStyle]}>
                    {item.text}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
};

export default InteractiveTranscripts;
