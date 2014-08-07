ie-touch
========

W3C Touch Events for IE10 and IE11 Mobile

  * [live test here](http://webreflection.github.io/ie-touch/)
  * [multi touch tesla test here](http://webreflection.github.io/ie-touch/tesla/)
  * related [blog post](http://webreflection.blogspot.com/2014/05/touch-events-for-ie-mobile.html) reasoning this polyfill

MIT Style License

### How To

Just include this file on top of your header, **before every other script** you might have in your page.


### CSS

In order to disable default OS behaviors on elements, don't forget to add the following: 
```css
.disablePanZoom {
  -ms-touch-action: none;
  touch-action: none;
}
```
and include `disablePanZoom` in the generic element class list.

### JS

In order to avoid text selection (brute force way) you might want to try the following:
```js
element.addEventListener(
  "selectstart",
  function(e) { e.preventDefault(); },
  false
);
```
