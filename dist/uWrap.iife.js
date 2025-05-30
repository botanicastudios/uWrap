var uWrap = (function (exports) {
  'use strict';

  /**
  * Copyright (c) 2025, Leon Sorokin
  * All rights reserved. (MIT Licensed)
  *
  * uWrap.js
  * A small, fast line wrapping thing for Canvas2D
  * https://github.com/leeoniya/uWrap (v0.1.0)
  */

  // BREAKS
  const D = "-".charCodeAt(0);
  const S = " ".charCodeAt(0);
  const N = "\n".charCodeAt(0);
  // const R = "\r".charCodeAt(0); (TODO: support \r\n breaks)
  // const T = "\t".charCodeAt(0);
  const SYMBS = `\`~!@#$%^&*()_+-=[]\\{}|;':",./<>? \t`;
  const NUMS = "1234567890";
  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const CHARS = `${UPPER}${LOWER}${NUMS}${SYMBS}`;
  function supportsLetterSpacing(ctx) {
      const _w = ctx.measureText("W").width;
      const _letterSpacing = ctx.letterSpacing;
      ctx.letterSpacing = "101px";
      const w = ctx.measureText("W").width;
      ctx.letterSpacing = _letterSpacing;
      return w > _w;
  }
  function varPreLine(ctx) {
      // Safari pre-18.4 does not support Canvas letterSpacing, and measureText() does not account for it
      // so we have to add it manually. https://caniuse.com/mdn-api_canvasrenderingcontext2d_letterspacing
      const fauxLetterSpacing = !supportsLetterSpacing(ctx)
          ? parseFloat(ctx.letterSpacing)
          : 0;
      // single-char widths in isolation
      const WIDTHS = {};
      // Pre-measure common characters
      for (let i = 0; i < CHARS.length; i++)
          WIDTHS[CHARS.charCodeAt(i)] =
              ctx.measureText(CHARS[i]).width + fauxLetterSpacing;
      const wordSpacing = parseFloat(ctx.wordSpacing);
      if (wordSpacing > 0)
          WIDTHS[S] = wordSpacing;
      // build kerning/spacing LUT of upper+lower, upper+sym, upper+upper pairs. (this includes letterSpacing)
      // holds kerning-adjusted width of the uppers
      const PAIRS = {};
      for (let i = 0; i < UPPER.length; i++) {
          let uc = UPPER.charCodeAt(i);
          PAIRS[uc] = {};
          for (let j = 0; j < CHARS.length; j++) {
              let ch = CHARS.charCodeAt(j);
              let wid = ctx.measureText(`${UPPER[i]}${CHARS[j]}`).width -
                  WIDTHS[ch] +
                  fauxLetterSpacing;
              PAIRS[uc][ch] = wid;
          }
      }
      // Helper to get character width, measuring if not already cached
      function getCharWidth(char, code) {
          if (!(code in WIDTHS)) {
              WIDTHS[code] = ctx.measureText(char).width + fauxLetterSpacing;
          }
          return WIDTHS[code];
      }
      const eachLine = () => { };
      function each(text, width, cb = eachLine) {
          let fr = 0;
          // Skip leading spaces
          while (fr < text.length && text.charCodeAt(fr) === S)
              fr++;
          let to = text.length - 1;
          // Skip trailing spaces
          while (to >= 0 && text.charCodeAt(to) === S)
              to--;
          let headIdx = fr;
          let headEnd = 0;
          let headWid = 0;
          let tailIdx = -1; // wrap candidate
          let tailWid = 0;
          let inWS = false;
          let i = fr;
          while (i <= to) {
              // Handle surrogate pairs and emoji sequences properly
              text[i];
              const code = text.codePointAt(i) || 0;
              const charLength = code > 0xffff ? 2 : 1; // Surrogate pairs take 2 positions
              let w = 0;
              // Check if we have a kerning pair
              if (code in PAIRS) {
                  const nextCode = text.codePointAt(i + charLength) || 0;
                  if (nextCode in PAIRS[code]) {
                      w = PAIRS[code][nextCode];
                  }
              }
              // If no kerning data, get/measure the width
              if (w === 0) {
                  w = getCharWidth(String.fromCodePoint(code), code);
              }
              if (code === S) {
                  //  || c === T || c === N || c === R
                  // set possible wrap point
                  if (text.charCodeAt(i + 1) !== S) {
                      tailIdx = i + 1;
                      tailWid = 0;
                  }
                  if (!inWS && headWid > 0) {
                      headWid += w;
                      headEnd = i;
                  }
                  inWS = true;
              }
              else if (code === N) {
                  if (cb(headIdx, i) === false)
                      return;
                  headIdx = headEnd = i + 1;
                  headWid = tailWid = 0;
                  tailIdx = -1;
              }
              else {
                  if (headEnd > headIdx && headWid + w > width) {
                      if (cb(headIdx, headEnd) === false)
                          return;
                      headWid = tailWid + w;
                      headIdx = headEnd = tailIdx;
                      tailWid = 0;
                      tailIdx = -1;
                  }
                  else {
                      if (code === D) {
                          // set possible wrap point
                          if (text.charCodeAt(i + 1) !== D) {
                              tailIdx = headEnd = i + 1;
                              tailWid = 0;
                          }
                      }
                      headWid += w;
                      tailWid += w;
                  }
                  inWS = false;
              }
              i += charLength;
          }
          cb(headIdx, to + 1);
      }
      return {
          each,
          split: (text, width, limit = Infinity) => {
              let out = [];
              each(text, width, (idx0, idx1) => {
                  out.push(text.slice(idx0, idx1));
                  if (out.length === limit)
                      return false;
              });
              return out;
          },
          count: (text, width) => {
              let count = 0;
              each(text, width, () => {
                  count++;
              });
              return count;
          },
          test: (text, width) => {
              let count = 0;
              each(text, width, () => {
                  if (++count === 2)
                      return false;
              });
              return count === 2;
          },
      };
  }

  exports.varPreLine = varPreLine;

  return exports;

})({});
