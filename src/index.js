"use strict";
exports.__esModule = true;
/* eslint-disable react-native/no-inline-styles */
var react_1 = require("react");
var react_native_1 = require("react-native");
var VTTtoJsonParser_js_1 = require("./VTTtoJsonParser.js");
var InteractiveTranscripts = function (_a) {
    var _b = _a.currentVideoProgress, currentVideoProgress = _b === void 0 ? 0 : _b, _c = _a.url, url = _c === void 0 ? '' : _c, _d = _a.textStyle, textStyle = _d === void 0 ? {} : _d, _e = _a.contentContainerStyle, contentContainerStyle = _e === void 0 ? {} : _e, activeTranscriptTextStyle = _a.activeTranscriptTextStyle, inactiveTranscriptTextStyle = _a.inactiveTranscriptTextStyle, onFocusNextLine = _a.onFocusNextLine;
    var _f = react_1.useState([]), cueArray = _f[0], setCueArray = _f[1];
    var _g = react_1.useState(-1), selectedIndex = _g[0], changeSelectedIndex = _g[1];
    react_1.useEffect(function () {
        cueArray.length === 0 &&
            fetch(url)
                .then(function (response) { return response.text(); })
                .then(function (text) {
                var output = VTTtoJsonParser_js_1["default"](text);
                setCueArray(output);
            });
        if (cueArray.length > 0) {
            var cueval = cueTextAndIndex(cueArray, currentVideoProgress);
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
    var cueTextAndIndex = react_1.useCallback(function (array, value) {
        var low = 0, high = array.length - 1;
        while (low < high) {
            var mid = (low + high) >>> 1;
            if (array[mid].startTime <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        low = low - 1;
        if (low < 0) {
            return { cuetext: '', cueindex: -1 };
        }
        return {
            cuetext: array[low].endTime >= value ? array[low].text : '',
            cueindex: array[low].endTime >= value ? array[low].sequence : -1
        };
    }, [url]);
    var lastNewLineTextIndex = react_1.useRef(-1);
    var formatText = function (text, index) {
        var hasNewLine = text.match(/\\n/g);
        if (hasNewLine) {
            // add two new lines when the text has a new line (also replaces normal \n with jsx \n)
            var textWithNewLine = text.replaceAll(/\\n/g, '\n\n');
            lastNewLineTextIndex.current = index;
            return textWithNewLine;
        }
        // if we had a new line previously, do not add a white space at the begginning of the text, which is a new row
        if (lastNewLineTextIndex.current + 1 === index) {
            return text.trim() + " ";
        }
        if (index === 0) {
            return text + " ";
        }
        return " " + text + " ";
    };
    return (<react_native_1.View style={contentContainerStyle}>
      {cueArray !== null && (<react_native_1.Text style={inactiveTranscriptTextStyle}>
          {cueArray.map(function (item, index) {
        return selectedIndex === index ? (<react_native_1.Text key={"" + item.text} style={[textStyle, activeTranscriptTextStyle]}>
                {formatText(item.text, index)}
              </react_native_1.Text>) : (<react_native_1.Text key={"" + item.text} style={[textStyle, inactiveTranscriptTextStyle]}>
                {formatText(item.text, index)}
              </react_native_1.Text>);
    })}
        </react_native_1.Text>)}
    </react_native_1.View>);
};
exports["default"] = InteractiveTranscripts;
