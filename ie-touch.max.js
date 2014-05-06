/*!
  The MIT License (MIT)

  Copyright (c) 2014-current Andrea Giammarchi

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
 */

/*

CSS
  Disables all pan/zoom behaviors and fire pointer events in JavaScript instead.
  .disablePanZoom {
    -ms-touch-action: none;
  }

JS
  Disables text selection
  element.addEventListener("selectstart", function(e) { e.preventDefault(); }, false);

*/

(function (navigator, document, pointerEnabled) {

  // highly experimental, should work on IE10 and IE11 only
  // normal IE mouse events won't be affected

  if (!(
    (pointerEnabled = !!navigator.pointerEnabled) ||
    navigator.msPointerEnabled
  ) ||
    'ontouchend' in document
  ) return;

  var
    // IE10 and IE11 have different names
    TYPE_MOUSE = (pointerEnabled ? '' : 'MS') + 'POINTER_TYPE_MOUSE',
    // for types too
    type = function (type) {
      return pointerEnabled ? type.toLowerCase() : 'MS' + type;
    },
    // while here a shortcut
    addListener = function (where, how, which) {
      // intercept all the pointer events
      how.call(where, type(which), handler, true);
    },
    // these are calls to the passed event
    commonMethod = function (name) {
      return {
        value: function () {
          Event[name].call(this);
          this._[name]();
        }
      };
    },
    // these are common DOM overrides
    commonOverride = function (proto, name) {
      var original = proto[name];
      Object.defineProperty(proto, name, {
        configurable: true,
        value: function (type, eventHandler, capture) {
          if (type in types) {
            original.call(
              type === 'touchstart' ?
                this : this.ownerDocument,
              types[type],
              handler,
              capture
            );
          }
          original.call(this, type, eventHandler, capture);
        }
      });
    },
    // these are delegated properties
    commonProperty = function (name) {
      return {
        get: function () {
          return this._[name];
        }
      };
    },
    // generates similar functions for similar cases
    upOrCancel = function (type) {
      return function (e) {
        var pointerId = e.pointerId,
            touch = touches[pointerId];
        delete touches[pointerId];
        dispatchEvent(type, e, touch);
        delete changedTouches[pointerId];
      };
    },
    // shortcut for all events
    dispatchEvent = function (type, e, touch) {
      var c = document.createEvent('Event');
      c.initEvent(type, true, true);
      _.value = e;
      TouchEventProperties.currentTarget.value = touch.currentTarget;
      Object.defineProperties(c, TouchEventProperties);
      touch.currentTarget.dispatchEvent(c);
    },
    get = function (name, object) {
      function returnID(id) {
        return object[id];
      }
      return function get() {
        _.value = Object.keys(object).map(returnID);
        return Object.defineProperty(this, name, _)[name];
      };
    },
    // basically says if it's touch or not
    humanReadablePointerType = function (e) {
      var pointerType = e.pointerType;
      return (
        pointerType === e[TYPE_MOUSE] ||
        pointerType === 'mouse'
      ) ? 'mouse' : 'touch'; // right now pen is fine as touch
    },
    // silly method for the TouchList nobody uses anyway
    item = function (i) {
      return this[i];
    },
    // recycle common descriptors too
    _ = {value: null},

    // the list of touches / changedTouches
    touches = Object.create(null),
    changedTouches = Object.create(null),
    // TODO: targetTouches = Object.create(null),

    Event = document.createEvent('Event'),
    // all properties per each event
    // defined at runtime .. not so fast
    // but still OKish in terms of RAM and CPU
    TouchEventProperties = {
      _: _,
      touches: {
        configurable: true,
        get: get('touches', touches)
      },
      changedTouches: {
        configurable: true,
        get: get('changedTouches', changedTouches)
      },
      currentTarget: {value:null},
      // almost everything is mirrored
      relatedTarget: commonProperty('relatedTarget'),
      target: commonProperty('target'),
      altKey: commonProperty('altKey'),
      metaKey: commonProperty('metaKey'),
      ctrlKey: commonProperty('ctrlKey'),
      shiftKey: commonProperty('shiftKey'),
      // including methods
      preventDefault: commonMethod('preventDefault'),
      stopPropagation: commonMethod('stopPropagation'),
      stopImmediatePropagation: commonMethod('stopImmediatePropagation')
    },
    // all types translated
    types = Object.create(null),
    // the unique handler for all the things
    handler = {
      _t: 0,
      handleEvent: function (e) {
        // when an event occurres
        if (humanReadablePointerType(e) === 'touch') {
          // invoke normalized methods
          handler[pointerEnabled ?
            e.type :
            e.type.slice(2).toLowerCase()
          ](e);
        }
      },
      pointerdown: function (e) {
        var touch = new Touch(e),
            pointerId = e.pointerId;
        changedTouches[pointerId] = touches[pointerId] = touch;
        dispatchEvent('touchstart', e, touch);
      },
      pointermove: function (e) {
        var pointerId = e.pointerId,
            touch = touches[pointerId];
        touch._ = e;
        dispatchEvent('touchmove', e, touch);
        changedTouches[pointerId]._ = e;
      },
      pointerup: upOrCancel('touchend'),
      pointercancel: upOrCancel('touchcancel')
    }
  ;

  // facade for initial events info
  function Touch(_) {
    // the event needs to be refreshed
    // each touchmove
    this._ = _;
    this.currentTarget = _.currentTarget;
  }

  // all common properties
  Object.defineProperties(
    Touch.prototype,
    {
      identifier: commonProperty('pointerId'),
      target: commonProperty('target'),
      screenX: commonProperty('screenX'),
      screenY: commonProperty('screenY'),
      clientX: commonProperty('clientX'),
      clientY: commonProperty('clientY'),
      pageX: commonProperty('pageX'),
      pageY: commonProperty('pageY')
    }
  );

  types.touchstart  = type('PointerDown');
  types.touchmove   = type('PointerMove');
  types.touchend    = type('PointerUp');
  types.touchcancel = type('PointerCancel');

  commonOverride(document, 'addEventListener');
  commonOverride(document, 'removeEventListener');
  commonOverride(Element.prototype, 'addEventListener');
  commonOverride(Element.prototype, 'removeEventListener');

  // mark these as available
  document.ontouchstart =
  document.ontouchmove =
  document.ontouchend =
  document.ontouchcancel = null;

}(navigator, document));