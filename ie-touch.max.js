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
    touch-action: none;
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
    // shortcuts
    ADD_EVENT_LISTENER = 'addEventListener',
    REMOVE_EVENT_LISTENER = 'removeEventListener',
    // used to force-simulate touch
    SET_CURRENT_CAPTURE = pointerEnabled ?
        'setPointerCapture' : 'msSetPointerCapture',
    RELEASE_CURRENT_CAPTURE = pointerEnabled ?
        'releasePointerCapture' : 'msReleasePointerCapture',
    // shortcut for common replacements
    ElementPrototype = Element.prototype,
    defineProperties = Object.defineProperties,
    defineProperty = Object.defineProperty,
    // for types too
    type = function (type) {
      var lo = type.toLowerCase(),
          ms = 'MS' + type;
      handler[ms] = handler[lo];
      return pointerEnabled ? lo: ms;
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
    // DOM Level 0 accessors
    createAccessor = function (type) {
      var ontype = '_on' + type;
      return {
        enumerable: true,
        configurable: true,
        get: function () {
          return this[ontype] || null;
        },
        set: function (callback) {
          if (this[ontype]) {
            this[REMOVE_EVENT_LISTENER](type, this[ontype]);
          }
          this[ontype] = callback;
          if (callback) {
            this[ADD_EVENT_LISTENER](type, callback);
          }
        }
      };
    },
    // these are common DOM overrides
    commonOverride = function (proto, name) {
      var original = proto[name];
      defineProperty(proto, name, {
        configurable: true,
        value: function (type, eventHandler, capture) {
          if (type in types) {
            original.call(
              this,
              types[type],
              handleEvent,
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
            touch = touches[pointerId],
            currentTarget = e.currentTarget;
        delete touches[pointerId];
        if (RELEASE_CURRENT_CAPTURE in currentTarget) {
          currentTarget[RELEASE_CURRENT_CAPTURE](e.pointerId);
        }
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
      defineProperties(c, TouchEventProperties);
      touch.currentTarget.dispatchEvent(c);
    },
    get = function (name, object) {
      function returnID(id) {
        return object[id];
      }
      return function get() {
        _.value = Object.keys(object).map(returnID);
        return defineProperty(this, name, _)[name];
      };
    },
    // basically says if it's touch or not
    humanReadablePointerType = function (e) {
      switch(e.pointerType) {
        case 'mouse':
        case e.MSPOINTER_TYPE_MOUSE:
          return 'mouse';
      }
      // pen is just fine as touch
      return 'touch';
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
    // boosted up eventListener
    handleEvent = function (e) {
      if (humanReadablePointerType(e) === 'touch') {
        // invoke normalized methods
        handler[e.type](e);
      }
    },
    // the unique handler for all the things
    handler = {
      pointerdown: function (e) {
        var touch = new Touch(e),
            pointerId = e.pointerId,
            currentTarget = e.currentTarget;
        changedTouches[pointerId] = touches[pointerId] = touch;
        if (SET_CURRENT_CAPTURE in currentTarget) {
          currentTarget[SET_CURRENT_CAPTURE](e.pointerId);
        }
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
    },
    accessors = {
      ontouchstart: createAccessor('touchstart'),
      ontouchmove: createAccessor('touchmove'),
      ontouchend: createAccessor('touchend'),
      ontouchcancel: createAccessor('touchcancel')
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
  defineProperties(
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

  commonOverride(document, ADD_EVENT_LISTENER);
  commonOverride(document, REMOVE_EVENT_LISTENER);
  commonOverride(ElementPrototype, ADD_EVENT_LISTENER);
  commonOverride(ElementPrototype, REMOVE_EVENT_LISTENER);

  // make these available as DOM Level 0
  defineProperties(document, accessors);
  defineProperties(ElementPrototype, accessors);

}(navigator, document));